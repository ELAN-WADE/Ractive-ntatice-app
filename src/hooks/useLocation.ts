// Custom hook for handling GPS tracking.
//
// Notes on how we handle GPS:
// - Getting a GPS lock on budget phones can take up to a minute, so we use a generous timeout before showing an error.
// - We throw out wild readings (accuracy > 150m) so the user doesn't bounce in and out of a zone on the map.
// - We keep a watcher running so the join button updates instantly when they walk into a zone.

import { useState, useEffect, useRef, useCallback } from 'react';
import * as ExpoLocation from 'expo-location';
import { useZoneStore } from '@/stores/useZoneStore';
import type { UserLocation, LocationPermissionStatus } from '@/types/location';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max acceptable accuracy in meters. Readings worse than this are discarded. */
const MAX_ACCURACY_METERS = 150;

/** How often to update GPS position (ms). Balances battery vs. freshness. */
const UPDATE_INTERVAL_MS = 5000;

/** How far the device must move (meters) to trigger a location update. */
const MIN_DISTANCE_METERS = 10;

/** Timeout before showing "location taking too long" warning (ms) */
const LOCATION_TIMEOUT_MS = 20000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseLocationReturn {
  location: UserLocation | null;
  permissionStatus: LocationPermissionStatus;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setUserLocation = useZoneStore((s) => s.setUserLocation);

  // Keep a ref to the watcher subscription so we can clean it up
  const watcherRef = useRef<ExpoLocation.LocationSubscription | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // ── Handle a new location reading ─────────────────────────────────────────
  const handleLocationUpdate = useCallback((loc: ExpoLocation.LocationObject) => {
    if (!isMountedRef.current) return;

    // If we get a valid reading, we can stop the "taking too long" timer.
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Discard inaccurate readings (e.g. first reading before GPS lock)
    const accuracy = loc.coords.accuracy ?? 999;
    if (accuracy > MAX_ACCURACY_METERS && location !== null) {
      // We already have a good reading — skip this inaccurate one
      return;
    }

    const userLocation: UserLocation = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      timestamp: loc.timestamp,
    };

    setLocation(userLocation);
    setIsLoading(false);
    setError(null);

    // Push to Zustand store — triggers zone re-evaluation
    setUserLocation(userLocation);
  }, [location, setUserLocation]);

  // ── Start watching location ────────────────────────────────────────────────
  const startWatching = useCallback(async () => {
    // Stop any existing watcher first
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }

    setIsLoading(true);
    setError(null);

    // Set a timeout to warn the user if location takes too long
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && isLoading) {
        setError(
          'Location is taking longer than usual. Please ensure GPS is enabled and you are outdoors.'
        );
        // Don't set isLoading=false yet — keep trying in background
      }
    }, LOCATION_TIMEOUT_MS);

    try {
      // Get one quick reading first for immediate feedback
      const quickLoc = await ExpoLocation.getLastKnownPositionAsync({
        maxAge: 60000, // Accept readings up to 1 minute old
        requiredAccuracy: MAX_ACCURACY_METERS,
      });

      if (quickLoc && isMountedRef.current) {
        handleLocationUpdate(quickLoc);
      }

      // Then start continuous watching
      const subscription = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.Balanced,
          timeInterval: UPDATE_INTERVAL_MS,
          distanceInterval: MIN_DISTANCE_METERS,
        },
        handleLocationUpdate
      );

      // CRITICAL FIX: The component might have unmounted while we were waiting
      // for the GPS promise to resolve. If it did, we have to kill the watcher
      // immediately or it'll keep running in the background and drain the battery.
      if (isMountedRef.current) {
        watcherRef.current = subscription;
      } else {
        subscription.remove();
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to get your location.';
        setError(message);
        setIsLoading(false);
      }
    }
  }, [handleLocationUpdate]);

  // ── Request permission ─────────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    setError(null);
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    const mappedStatus = status as LocationPermissionStatus;
    setPermissionStatus(mappedStatus);

    if (mappedStatus === 'granted') {
      await startWatching();
    } else {
      setIsLoading(false);
      setError(
        'Location permission denied. Please enable it in your device settings to use zone verification.'
      );
    }
  }, [startWatching]);

  // ── Manual refresh ─────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (permissionStatus === 'granted') {
      await startWatching();
    } else {
      await requestPermission();
    }
  }, [permissionStatus, startWatching, requestPermission]);

  // ── On mount: check existing permission then start ─────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      const mappedStatus = status as LocationPermissionStatus;
      setPermissionStatus(mappedStatus);

      if (mappedStatus === 'granted') {
        await startWatching();
      } else if (mappedStatus === 'undetermined') {
        // First time — ask for permission
        await requestPermission();
      } else {
        // Previously denied
        setIsLoading(false);
        setError(
          'Location permission was denied. Please enable it in your device settings.'
        );
      }
    })();

    return () => {
      isMountedRef.current = false;
      if (watcherRef.current) {
        watcherRef.current.remove();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    location,
    permissionStatus,
    isLoading,
    error,
    requestPermission,
    refresh,
  };
}
