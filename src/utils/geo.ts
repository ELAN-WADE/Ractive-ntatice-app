// Math and geometry utilities.
// 
// Why use Turf.js on the phone?
// Because asking the server "am I in this zone?" takes 2-5 seconds on a slow 3G network.
// Doing it locally with Turf takes 2 milliseconds. It gives the user instant feedback,
// even though we still double-check with the server later for security.

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';
import type { Zone, Coordinates } from '@/types/location';

// ─── Point-in-Polygon Check ───────────────────────────────────────────────────

// Checks if a GPS coordinate is inside a drawn polygon.
export function isPointInZone(coords: Coordinates, zone: Zone): boolean {
  try {
    // GeoJSON uses [longitude, latitude] order (opposite to maps convention)
    const pt = point([coords.longitude, coords.latitude]);
    const poly = polygon(zone.geojson.coordinates);
    return booleanPointInPolygon(pt, poly);
  } catch (error) {
    // If geometry is malformed, fail safe (return false)
    console.warn(`[geo] Error checking point in zone "${zone.name}":`, error);
    return false;
  }
}

// Loops through all zones to figure out which one the user is standing in.
export function findUserZone(coords: Coordinates, zones: Zone[]): Zone | null {
  for (const zone of zones) {
    if (isPointInZone(coords, zone)) {
      return zone;
    }
  }
  return null;
}

// ─── Coordinate Conversion ────────────────────────────────────────────────────

// React Native Maps and GeoJSON violently disagree on coordinate formats.
// Maps wants { latitude, longitude }. GeoJSON wants [longitude, latitude].
// This function fixes that mismatch so the map doesn't crash.
export function geojsonRingToMapCoords(
  ring: [number, number][]
): Coordinates[] {
  return ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

/**
 * Converts a Zone's GeoJSON polygon into an array of lat/lng pairs
 * suitable for MapView's `Polygon` component.
 */
export function zoneToMapPolygonCoords(zone: Zone): Coordinates[] {
  // Use the outer ring only (index 0); ignore holes
  const outerRing = zone.geojson.coordinates[0];
  return geojsonRingToMapCoords(outerRing);
}

// ─── Distance Utility ─────────────────────────────────────────────────────────

/**
 * Calculates the Haversine distance between two coordinate pairs in kilometers.
 * Useful for estimating "how far outside" a zone the user is.
 */
export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const a2 =
    sinDLat * sinDLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
  return R * c;
}

/**
 * Calculates the centroid of a polygon's outer ring.
 * Used to find the center of a zone for map camera positioning.
 */
export function polygonCentroid(coords: Coordinates[]): Coordinates {
  const n = coords.length;
  if (n === 0) return { latitude: 0, longitude: 0 };

  const sum = coords.reduce(
    (acc, c) => ({
      latitude: acc.latitude + c.latitude,
      longitude: acc.longitude + c.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: sum.latitude / n,
    longitude: sum.longitude / n,
  };
}
