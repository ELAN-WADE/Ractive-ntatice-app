-- ============================================================
-- Migration 001: Enable PostGIS Extension
-- ============================================================
-- PostGIS adds spatial/geographic data types and functions.
-- Required for storing and querying polygon/point geometries.

CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS is installed
SELECT PostGIS_version();
