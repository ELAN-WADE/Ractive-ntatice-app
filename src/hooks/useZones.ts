// Wraps the zone store so components don't have to worry about fetching or caching.
// It also figures out which zone the user is currently standing in on the fly.

import { useEffect, useCallback, useMemo } from 'react';
import { useZoneStore } from '@/stores/useZoneStore';
import { findUserZone } from '@/utils/geo';
import type { Zone } from '@/types/location';

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseZonesReturn {
  zones: Zone[];
  activeZone: Zone | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useZones(): UseZonesReturn {
  const zones = useZoneStore((s) => s.zones);
  const userLocation = useZoneStore((s) => s.userLocation);
  const isLoadingZones = useZoneStore((s) => s.isLoadingZones);
  const zonesError = useZoneStore((s) => s.zonesError);
  const loadZones = useZoneStore((s) => s.loadZones);

  // Load zones on first mount (respects cache internally)
  useEffect(() => {
    loadZones();
  }, []);

  // Force a fresh fetch (e.g. on pull-to-refresh)
  const refetch = useCallback(async () => {
    await loadZones(true);
  }, [loadZones]);

  // Figure out if the user is inside a zone right now.
  // We use turf.js under the hood so this is lightning fast.
  const activeZone = useMemo(() => {
    if (!userLocation || zones.length === 0) return null;
    return findUserZone(
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      zones
    );
  }, [userLocation, zones]);

  return {
    zones,
    activeZone,
    isLoading: isLoadingZones,
    error: zonesError,
    refetch,
  };
}
