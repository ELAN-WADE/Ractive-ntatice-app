-- ============================================================
-- Migration 003: Create Join Requests Table
-- ============================================================
-- Tracks neighborhood membership requests with both client
-- and server-side zone verification results.

-- Status enum for join requests
CREATE TYPE public.join_request_status AS ENUM (
  'pending',      -- Submitted, awaiting admin review (outside all zones)
  'approved',     -- Auto-approved (server confirmed user is inside a zone)
  'rejected',     -- Admin rejected the request
  'under_review'  -- Client matched a zone but server did not confirm (boundary case)
);

CREATE TABLE IF NOT EXISTS public.join_requests (
  id                    UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References the authenticated user (links to auth.users)
  user_id               UUID                      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Which zone matched (null if user is outside all zones)
  zone_id               UUID                      REFERENCES public.zones(id) ON DELETE SET NULL,
  
  -- PostGIS point geometry for spatial queries
  location_geometry     GEOMETRY(Point, 4326),
  
  -- GeoJSON point stored separately for easy REST API access
  location_geojson      JSONB,
  
  -- Raw lat/lng for easy filtering without PostGIS parsing
  latitude              DOUBLE PRECISION          NOT NULL,
  longitude             DOUBLE PRECISION          NOT NULL,
  
  -- Dual verification results
  client_zone_matched   BOOLEAN                   NOT NULL DEFAULT false,
  server_zone_matched   BOOLEAN                   NOT NULL DEFAULT false,
  
  -- Final decision
  status                public.join_request_status NOT NULL DEFAULT 'pending',
  
  -- Human-readable note for admin review
  review_note           TEXT,
  
  created_at            TIMESTAMPTZ               NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ               NOT NULL DEFAULT now()
);

-- Spatial index on user location points
CREATE INDEX IF NOT EXISTS join_requests_location_idx
  ON public.join_requests USING GIST (location_geometry);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS join_requests_user_id_idx
  ON public.join_requests (user_id);
CREATE INDEX IF NOT EXISTS join_requests_status_idx
  ON public.join_requests (status);
CREATE INDEX IF NOT EXISTS join_requests_zone_id_idx
  ON public.join_requests (zone_id);

-- One active (non-rejected) request per user
-- Prevents spamming join requests
CREATE UNIQUE INDEX IF NOT EXISTS join_requests_user_active_idx
  ON public.join_requests (user_id)
  WHERE status IN ('pending', 'approved', 'under_review');

-- Updated_at trigger
CREATE TRIGGER join_requests_updated_at
  BEFORE UPDATE ON public.join_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Users can only read their own requests
CREATE POLICY "join_requests_user_read_own"
  ON public.join_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can create their own request
CREATE POLICY "join_requests_user_insert_own"
  ON public.join_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users cannot update their own request (only admins/service role can)
-- This prevents users from self-approving their requests
CREATE POLICY "join_requests_service_role_all"
  ON public.join_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
