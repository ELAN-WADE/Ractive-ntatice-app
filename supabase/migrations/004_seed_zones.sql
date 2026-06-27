-- ============================================================
-- Migration 004: Seed Zone Data
-- ============================================================
-- Seeds 2 hardcoded neighborhood zones for Lagos, Nigeria:
-- 1. Lekki Phase 1 (Lagos Island, affluent residential)
-- 2. Yaba Tech Hub (Lagos Mainland, tech startup cluster)
--
-- Coordinates are approximate polygon boundaries in WGS84 (EPSG:4326).
-- ST_GeomFromText uses WKT format: POLYGON((lng lat, lng lat, ...))
-- Note: WKT uses (longitude latitude) order, not (latitude longitude).

INSERT INTO public.zones (id, name, description, geometry, geojson, color)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Lekki Phase 1',
    'Lekki Phase 1 residential area — a prestigious gated community on Lagos Island known for its planned infrastructure and upscale residences.',
    -- WKT polygon: POLYGON((lng lat, ...)) — must close the ring (first = last point)
    ST_GeomFromText(
      'POLYGON((
        3.4721 6.4479,
        3.4835 6.4479,
        3.4900 6.4530,
        3.4890 6.4600,
        3.4780 6.4640,
        3.4670 6.4620,
        3.4640 6.4560,
        3.4680 6.4490,
        3.4721 6.4479
      ))',
      4326
    ),
    -- GeoJSON representation (mirrors the geometry above, for REST API access)
    '{
      "type": "Polygon",
      "coordinates": [[
        [3.4721, 6.4479],
        [3.4835, 6.4479],
        [3.4900, 6.4530],
        [3.4890, 6.4600],
        [3.4780, 6.4640],
        [3.4670, 6.4620],
        [3.4640, 6.4560],
        [3.4680, 6.4490],
        [3.4721, 6.4479]
      ]]
    }'::jsonb,
    '#3B82F6'  -- blue
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Yaba Tech Hub',
    'Yaba technology and innovation district on Lagos Mainland — home to Co-Creation Hub, Andela, Flutterwave HQ, and dozens of tech startups.',
    ST_GeomFromText(
      'POLYGON((
        3.3720 6.5050,
        3.3810 6.5050,
        3.3860 6.5090,
        3.3850 6.5150,
        3.3780 6.5180,
        3.3700 6.5160,
        3.3670 6.5110,
        3.3690 6.5060,
        3.3720 6.5050
      ))',
      4326
    ),
    '{
      "type": "Polygon",
      "coordinates": [[
        [3.3720, 6.5050],
        [3.3810, 6.5050],
        [3.3860, 6.5090],
        [3.3850, 6.5150],
        [3.3780, 6.5180],
        [3.3700, 6.5160],
        [3.3670, 6.5110],
        [3.3690, 6.5060],
        [3.3720, 6.5050]
      ]]
    }'::jsonb,
    '#10B981'  -- green
  )
ON CONFLICT (id) DO NOTHING;

-- Verify seed data
SELECT id, name, ST_AsText(geometry) AS wkt FROM public.zones;
