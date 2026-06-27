// Handles fetching zones from the database and doing the heavy-duty security checks.
//
// We do a quick check on the phone (using turf.js) so the UI feels fast, but we ALWAYS
// double-check with the database (PostGIS) before approving a user to prevent GPS spoofing.

import { supabase } from './supabase';
import type { Zone } from '@/types/location';
import type { ZoneRow, CheckZoneResponse } from '@/types/database';

// ─── Hardcoded Fallback Zones ─────────────────────────────────────────────────
// Fallback zones in case Supabase is down or the user has zero signal.
// This keeps the app from crashing when offline.
export const HARDCODED_ZONES: Zone[] = [
  {
    id: 'zone-lekki-phase1',
    name: 'Lekki Phase 1',
    description: 'Lekki Phase 1 residential area, Lagos Island',
    color: '#3B82F6', // blue
    boundary: [
      { latitude: 6.4479, longitude: 3.4721 },
      { latitude: 6.4479, longitude: 3.4835 },
      { latitude: 6.4530, longitude: 3.4900 },
      { latitude: 6.4600, longitude: 3.4890 },
      { latitude: 6.4640, longitude: 3.4780 },
      { latitude: 6.4620, longitude: 3.4670 },
      { latitude: 6.4560, longitude: 3.4640 },
      { latitude: 6.4490, longitude: 3.4680 },
      { latitude: 6.4479, longitude: 3.4721 },
    ],
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          // Approximate boundary of Lekki Phase 1
          [3.4721, 6.4479],
          [3.4835, 6.4479],
          [3.4900, 6.4530],
          [3.4890, 6.4600],
          [3.4780, 6.4640],
          [3.4670, 6.4620],
          [3.4640, 6.4560],
          [3.4680, 6.4490],
          [3.4721, 6.4479], // close the ring
        ],
      ],
    },
  },
  {
    id: 'zone-yaba-tech-hub',
    name: 'Yaba Tech Hub',
    description: 'Yaba technology hub and innovation cluster, Lagos Mainland',
    color: '#10B981', // green
    boundary: [
      { latitude: 6.5050, longitude: 3.3720 },
      { latitude: 6.5050, longitude: 3.3810 },
      { latitude: 6.5090, longitude: 3.3860 },
      { latitude: 6.5150, longitude: 3.3850 },
      { latitude: 6.5180, longitude: 3.3780 },
      { latitude: 6.5160, longitude: 3.3700 },
      { latitude: 6.5110, longitude: 3.3670 },
      { latitude: 6.5060, longitude: 3.3690 },
      { latitude: 6.5050, longitude: 3.3720 },
    ],
    geojson: {
      type: 'Polygon',
      coordinates: [
        [
          // Approximate boundary of the Yaba tech cluster
          [3.3720, 6.5050],
          [3.3810, 6.5050],
          [3.3860, 6.5090],
          [3.3850, 6.5150],
          [3.3780, 6.5180],
          [3.3700, 6.5160],
          [3.3670, 6.5110],
          [3.3690, 6.5060],
          [3.3720, 6.5050], // close the ring
        ],
      ],
    },
  },
];

// ─── Zone Fetching ────────────────────────────────────────────────────────────

// Formats the raw database rows into something the app can actually use.
function zoneRowToZone(row: ZoneRow): Zone {
  const geojson = row.geojson;
  
  let outerRing: [number, number][] = [];
  let normalizedGeojson: Zone['geojson'] = { type: 'Polygon', coordinates: [] };

  if (geojson && geojson.coordinates && Array.isArray(geojson.coordinates)) {
    if (geojson.type === 'Polygon') {
      outerRing = geojson.coordinates[0] ?? [];
      normalizedGeojson = geojson;
    } else if ((geojson as unknown as { type: string }).type === 'MultiPolygon') {
      const multiCoords = (geojson as unknown as { coordinates: [number, number][][][] }).coordinates;
      const firstPolygon = multiCoords[0];
      if (Array.isArray(firstPolygon)) {
        outerRing = firstPolygon[0] ?? [];
      }
      normalizedGeojson = { type: 'Polygon', coordinates: firstPolygon ?? [] };
    }
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    boundary: outerRing.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
    geojson: normalizedGeojson,
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const ZONES_CACHE_KEY = '@neighborhub_zones_cache';

async function getCachedZones(): Promise<Zone[] | null> {
  try {
    const json = await AsyncStorage.getItem(ZONES_CACHE_KEY);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.warn('[zones] Failed to load zones cache:', e);
    return null;
  }
}

async function saveZonesToCache(zones: Zone[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ZONES_CACHE_KEY, JSON.stringify(zones));
  } catch (e) {
    console.warn('[zones] Failed to save zones to cache:', e);
  }
}

// Pulls zones from Supabase. If the network drops, it quietly checks cache, then falls back to hardcoded ones.
export async function fetchZones(): Promise<Zone[]> {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('id, name, description, color, geojson, created_at, updated_at')
      .order('name');

    if (error) {
      console.warn('[zones] Supabase error, checking cache:', error.message);
      const cached = await getCachedZones();
      return cached ?? HARDCODED_ZONES;
    }

    if (!data || data.length === 0) {
      console.warn('[zones] No zones in DB, checking cache.');
      const cached = await getCachedZones();
      return cached ?? HARDCODED_ZONES;
    }

    const parsedZones = (data as ZoneRow[]).map(zoneRowToZone);
    await saveZonesToCache(parsedZones);
    return parsedZones;
  } catch (err) {
    // Network error — try cache
    console.error('[zones] Network error fetching zones, checking cache:', err);
    const cached = await getCachedZones();
    return cached ?? HARDCODED_ZONES;
  }
}

// ─── Server-Side Zone Verification ───────────────────────────────────────────

// The real security check. Asks the database "is this GPS coordinate actually inside a zone?"
// This prevents users from hacking the client-side location checks.
export async function verifyZoneOnServer(
  latitude: number,
  longitude: number
): Promise<CheckZoneResponse | null> {
  try {
    const { data, error } = await supabase.rpc(
      'check_zone',
      { lat: latitude, lng: longitude }
    );

    if (error) {
      console.error('[zones] RPC check_zone error:', error.message);
      return null;
    }

    return data as CheckZoneResponse;
  } catch (err) {
    // Network timeout — return null to let the caller handle gracefully
    console.error('[zones] Network error calling check_zone RPC:', err);
    return null;
  }
}
