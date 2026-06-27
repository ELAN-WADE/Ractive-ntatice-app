/**
 * Database types mirroring the Supabase schema.
 * These are the raw types returned by Supabase queries.
 * Keep these in sync with your Supabase table definitions.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

/** Status of a neighborhood join request */
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'under_review';

// ─── Table Row Types ──────────────────────────────────────────────────────────

/**
 * Represents a row in the `zones` table.
 * The `geometry` field is a WKT or GeoJSON string when fetched via REST API.
 */
export interface ZoneRow {
  id: string;
  name: string;
  description: string | null;
  /** GeoJSON Polygon geometry (returned as JSON from Supabase REST) */
  geojson: GeoJSONPolygon | null;
  color: string;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a row in the `join_requests` table.
 */
export interface JoinRequestRow {
  id: string;
  user_id: string;
  zone_id: string | null;
  /** GeoJSON Point geometry */
  location_geojson: GeoJSONPoint | null;
  /** Raw lat/lng stored for easy querying without PostGIS parsing */
  latitude: number;
  longitude: number;
  /** Whether the client-side turf check matched a zone */
  client_zone_matched: boolean;
  /** Whether the server-side PostGIS check matched a zone */
  server_zone_matched: boolean;
  status: JoinRequestStatus;
  /** Human-readable note about why the request was flagged/approved */
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Insert Types (used when creating new records) ────────────────────────────

export type JoinRequestInsert = Omit<
  JoinRequestRow,
  'id' | 'created_at' | 'updated_at'
>;

// ─── GeoJSON Types ────────────────────────────────────────────────────────────

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // Array of rings, each ring is array of [lng, lat]
}

// ─── RPC Response Types ───────────────────────────────────────────────────────

/** Response from the Supabase `check_zone` RPC function */
export interface CheckZoneResponse {
  zone_id: string | null;
  zone_name: string | null;
  is_inside: boolean;
}

// ─── Supabase Database schema type (for typed client) ────────────────────────

export interface Database {
  public: {
    Tables: {
      zones: {
        Row: ZoneRow;
        Insert: Omit<ZoneRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ZoneRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      join_requests: {
        Row: JoinRequestRow;
        Insert: JoinRequestInsert;
        Update: Partial<JoinRequestInsert>;
      };
    };
    Functions: {
      check_zone: {
        Args: { lat: number; lng: number };
        Returns: CheckZoneResponse;
      };
    };
  };
}
