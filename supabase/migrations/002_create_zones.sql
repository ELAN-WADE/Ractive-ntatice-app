-- ============================================================
-- Migration 002: Create Zones Table
-- ============================================================
-- Stores neighborhood zones as PostGIS polygon geometries.
-- SRID 4326 = WGS84 (standard GPS lat/lng coordinate system).

CREATE TABLE IF NOT EXISTS public.zones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  
  -- PostGIS polygon geometry in WGS84 (lat/lng) coordinates
  -- The geometry column stores the actual spatial data for PostGIS queries
  geometry    GEOMETRY(Polygon, 4326) NOT NULL,
  
  -- GeoJSON representation stored separately for easy REST API access
  -- (PostGIS geometry is binary; GeoJSON is readable by the JS client)
  geojson     JSONB,
  
  -- Display color as hex string (e.g. '#3B82F6')
  color       TEXT        NOT NULL DEFAULT '#3B82F6',
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index on the geometry column — critical for ST_Within performance
CREATE INDEX IF NOT EXISTS zones_geometry_idx
  ON public.zones USING GIST (geometry);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zones_updated_at
  BEFORE UPDATE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- Anyone (authenticated or anonymous) can READ zones
-- Zone data is public — users need to see the zones to know where to go
CREATE POLICY "zones_public_read"
  ON public.zones
  FOR SELECT
  USING (true);

-- Only service role (admin/backend) can INSERT/UPDATE/DELETE zones
-- Regular users cannot modify zone boundaries
CREATE POLICY "zones_service_role_write"
  ON public.zones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
