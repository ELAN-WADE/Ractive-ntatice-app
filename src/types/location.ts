/**
 * Location and Zone domain types.
 * These are the app-level types used throughout components and stores,
 * separate from the raw database row types.
 */

// ─── Coordinates ──────────────────────────────────────────────────────────────

/** A simple lat/lng coordinate pair */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** A lat/lng coordinate pair with optional accuracy */
export interface UserLocation extends Coordinates {
  accuracy: number | null;
  /** Timestamp (ms epoch) when this reading was captured */
  timestamp: number;
}

// ─── Zones ────────────────────────────────────────────────────────────────────

/**
 * App-level Zone type (enriched from DB ZoneRow).
 * Polygon coordinates are pre-parsed for turf.js usage.
 */
export interface Zone {
  id: string;
  name: string;
  description: string | null;
  /** Display color for the polygon overlay */
  color: string;
  /**
   * Polygon boundary as an array of coordinate pairs.
   * Format: [[lat, lng], ...] — note this is lat/lng for MapView,
   * but will be converted to [lng, lat] for turf.js.
   */
  boundary: Coordinates[];
  /**
   * Raw GeoJSON polygon (as returned from DB), used for turf operations.
   * Format: [[lng, lat], ...] per the GeoJSON spec.
   */
  geojson: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

// ─── Join Request ─────────────────────────────────────────────────────────────

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'under_review';

/** Result of a join request submission */
export interface JoinRequestResult {
  requestId: string;
  status: JoinRequestStatus;
  message: string;
  zoneId: string | null;
  zoneName: string | null;
}

// ─── Zone Check Result ────────────────────────────────────────────────────────

/** Result of checking if a user is inside any zone */
export interface ZoneCheckResult {
  isInsideZone: boolean;
  matchedZone: Zone | null;
  /** True if the client-side turf check matched */
  clientVerified: boolean;
  /** True if the server-side PostGIS RPC matched */
  serverVerified: boolean;
}

// ─── Location Permission ──────────────────────────────────────────────────────

export type LocationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'restricted';

export interface LocationState {
  location: UserLocation | null;
  permissionStatus: LocationPermissionStatus;
  isLoading: boolean;
  error: string | null;
}
