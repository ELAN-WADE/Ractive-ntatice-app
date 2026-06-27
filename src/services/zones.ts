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
    boundary: [], // populated from geojson below
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
    boundary: [],
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
  let normalizedGeojson = { type: 'Polygon' as const, coordinates: [] as any[] };

  // Safely extract the outer boundary ring depending on the geometry type
  if (geojson && geojson.coordinates && Array.isArray(geojson.coordinates)) {
    if (geojson.type === 'Polygon') {
      outerRing = (geojson.coordinates[0] as [number, number][]) ?? [];
      normalizedGeojson = geojson as any;
    } else if (geojson.type === 'MultiPolygon') {
      // For MultiPolygon, grab the outer ring of the first polygon
      const firstPolygon = geojson.coordinates[0];
      if (Array.isArray(firstPolygon)) {
        outerRing = (firstPolygon[0] as any as [number, number][]) ?? [];
      }
      normalizedGeojson = geojson as any;
    }
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    boundary: outerRing.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
    geojson: normalizedGeojson as any,
  };
}

// Pulls zones from Supabase. If the network drops, it quietly fails over to the hardcoded ones.
export async function fetchZones(): Promise<Zone[]> {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('id, name, description, color, geojson, created_at, updated_at')
      .order('name');

    if (error) {
      console.warn('[zones] Supabase error, falling back to hardcoded zones:', error.message);
      return HARDCODED_ZONES;
    }

    if (!data || data.length === 0) {
      console.warn('[zones] No zones in DB, using hardcoded fallback.');
      return HARDCODED_ZONES;
    }

    return (data as ZoneRow[]).map(zoneRowToZone);
  } catch (err) {
    // Network error — fall back gracefully
    console.error('[zones] Network error fetching zones:', err);
    return HARDCODED_ZONES;
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
      // TypeScript can't statically resolve custom RPC arg shapes without a
      // generated types file (`supabase gen types typescript`). The runtime
      // shape is correct; cast to `any` to unblock until types are generated.
      { lat: latitude, lng: longitude } as any
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
