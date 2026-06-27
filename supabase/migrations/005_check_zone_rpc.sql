-- ============================================================
-- Migration 005: Create check_zone RPC Function
-- ============================================================
-- Server-side zone verification using PostGIS ST_Within.
--
-- This is the security anchor of the system:
-- The client-side turf.js check is for UX speed only.
-- This RPC function is the authoritative, tamper-proof verification.
--
-- Usage from Supabase JS client:
--   const { data } = await supabase.rpc('check_zone', { lat: 6.45, lng: 3.48 })
--   // Returns: { zone_id, zone_name, is_inside }
--
-- Security considerations:
-- - Runs as SECURITY DEFINER so it can read zones regardless of RLS
-- - The caller must be authenticated (enforced by Supabase anon/auth key separation)
-- - Input lat/lng are validated to reasonable ranges

CREATE OR REPLACE FUNCTION public.check_zone(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS TABLE (
  zone_id   UUID,
  zone_name TEXT,
  is_inside BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges to bypass RLS on zones
SET search_path = public
AS $$
DECLARE
  v_point GEOMETRY;
BEGIN
  -- ── Input validation ────────────────────────────────────────────────────
  -- Reject obviously invalid coordinates before doing any spatial work
  IF lat < -90 OR lat > 90 THEN
    RAISE EXCEPTION 'Invalid latitude: %. Must be between -90 and 90.', lat;
  END IF;

  IF lng < -180 OR lng > 180 THEN
    RAISE EXCEPTION 'Invalid longitude: %. Must be between -180 and 180.', lng;
  END IF;

  -- ── Construct point geometry ────────────────────────────────────────────
  -- ST_SetSRID ensures the SRID matches our zones table (EPSG:4326 = WGS84)
  -- ST_MakePoint takes (longitude, latitude) — note the order!
  v_point := ST_SetSRID(ST_MakePoint(lng, lat), 4326);

  -- ── Spatial query ───────────────────────────────────────────────────────
  -- ST_Within(point, polygon) returns true if the point is strictly inside
  -- the polygon boundary. Uses the GIST spatial index for performance.
  RETURN QUERY
    SELECT
      z.id         AS zone_id,
      z.name       AS zone_name,
      TRUE         AS is_inside
    FROM public.zones z
    WHERE ST_Within(v_point, z.geometry)
    LIMIT 1;  -- A point can only be in one zone (non-overlapping zones)

  -- ── If no zone matched, return a "not inside" row ───────────────────────
  IF NOT FOUND THEN
    RETURN QUERY
      SELECT
        NULL::UUID AS zone_id,
        NULL::TEXT AS zone_name,
        FALSE      AS is_inside;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
-- Anonymous users (not logged in) cannot call this function
GRANT EXECUTE ON FUNCTION public.check_zone(DOUBLE PRECISION, DOUBLE PRECISION)
  TO authenticated;

-- Revoke from public/anon for security
REVOKE EXECUTE ON FUNCTION public.check_zone(DOUBLE PRECISION, DOUBLE PRECISION)
  FROM anon;

-- ── Test the function ───────────────────────────────────────────────────────
-- Point inside Lekki Phase 1 (approximate center):
-- SELECT * FROM check_zone(6.455, 3.477);
--
-- Point inside Yaba Tech Hub (approximate center):
-- SELECT * FROM check_zone(6.511, 3.378);
--
-- Point outside all zones (Victoria Island):
-- SELECT * FROM check_zone(6.428, 3.421);


-- ============================================================
-- Helper view for admin: join requests with zone info
-- ============================================================

CREATE OR REPLACE VIEW public.join_requests_with_zone AS
  SELECT
    jr.id,
    jr.user_id,
    au.email AS user_email,
    z.name   AS zone_name,
    jr.latitude,
    jr.longitude,
    jr.client_zone_matched,
    jr.server_zone_matched,
    jr.status,
    jr.review_note,
    jr.created_at
  FROM public.join_requests jr
  LEFT JOIN public.zones z      ON z.id = jr.zone_id
  LEFT JOIN auth.users au       ON au.id = jr.user_id
  ORDER BY jr.created_at DESC;

-- Only service role (admin dashboard) can access this view
GRANT SELECT ON public.join_requests_with_zone TO service_role;
