// Caches zone boundaries so we aren't pinging Supabase every time the user opens the map.
// This is super important for users on spotty 3G networks so they don't stare at loading spinners.
// We also track their GPS location here.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchZones } from '@/services/zones';
import { getUserJoinRequest } from '@/services/joinRequests';
import type { Zone, UserLocation, JoinRequestResult } from '@/types/location';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZoneState {
  // Zone data
  zones: Zone[];
  isLoadingZones: boolean;
  zonesError: string | null;
  lastFetchedAt: number | null;

  // User location
  userLocation: UserLocation | null;

  // Join request result
  joinRequestResult: JoinRequestResult | null;
  isSubmittingRequest: boolean;
  requestError: string | null;

  // Actions
  loadZones: (force?: boolean) => Promise<void>;
  setUserLocation: (location: UserLocation) => void;
  setJoinRequestResult: (result: JoinRequestResult | null) => void;
  setIsSubmittingRequest: (isSubmitting: boolean) => void;
  setRequestError: (error: string | null) => void;
  clearRequestState: () => void;
}

// ─── Cache Duration ───────────────────────────────────────────────────────────

// Cache zones for 5 minutes.
// Neighborhood borders don't change often, so we don't need to be aggressive here.
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// ─── Store ────────────────────────────────────────────────────────────────────

export const useZoneStore = create<ZoneState>((set, get) => ({
  zones: [],
  isLoadingZones: false,
  zonesError: null,
  lastFetchedAt: null,

  userLocation: null,

  joinRequestResult: null,
  isSubmittingRequest: false,
  requestError: null,

  // Fetch zones from Supabase unless we already grabbed them recently.
  // Pass `force: true` to bypass the cache (e.g. pull-to-refresh).
  loadZones: async (force = false) => {
    const { lastFetchedAt, isLoadingZones } = get();

    // Avoid duplicate concurrent requests
    if (isLoadingZones) return;

    // Use cached data if still fresh
    const isCacheValid =
      lastFetchedAt !== null &&
      Date.now() - lastFetchedAt < CACHE_DURATION_MS;

    if (!force && isCacheValid) {
      return;
    }

    set({ isLoadingZones: true, zonesError: null });

    try {
      const zones = await fetchZones();

      // Retrieve existing request for the user to restore status on app load
      let requestResult: JoinRequestResult | null = null;
      try {
        const existingRequest = await getUserJoinRequest();
        if (existingRequest) {
          const matchedZone = zones.find((z) => z.id === existingRequest.zone_id);
          const zoneName = matchedZone ? matchedZone.name : null;
          const status = existingRequest.status;

          // Compute message based on status
          let message = 'Your request has been submitted for manual review.';
          if (status === 'approved') {
            message = `Welcome to ${zoneName ?? 'the neighborhood'}! Your request has been auto-approved.`;
          } else if (status === 'under_review') {
            message = `Your location is near the ${zoneName ?? 'zone'} boundary. An admin will review your request shortly.`;
          } else if (status === 'rejected') {
            message = `Your request to join ${zoneName ?? 'the neighborhood'} was rejected.`;
          }

          requestResult = {
            requestId: existingRequest.id,
            status,
            message,
            zoneId: existingRequest.zone_id,
            zoneName,
          };
        }
      } catch (reqErr) {
        console.warn('[useZoneStore] Failed to check for existing join requests:', reqErr);
      }

      set({
        zones,
        joinRequestResult: requestResult,
        isLoadingZones: false,
        lastFetchedAt: Date.now(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load zones.';
      set({
        zonesError: message,
        isLoadingZones: false,
      });
    }
  },

  // Update the user's current GPS coordinates.
  // This is piped in from the `useLocation` hook in real-time.
  setUserLocation: (location: UserLocation) => {
    set({ userLocation: location });
  },

  setJoinRequestResult: (result) => set({ joinRequestResult: result }),
  setIsSubmittingRequest: (isSubmitting) => set({ isSubmittingRequest: isSubmitting }),
  setRequestError: (error) => set({ requestError: error }),

  clearRequestState: () => {
    set({
      joinRequestResult: null,
      isSubmittingRequest: false,
      requestError: null,
    });
    AsyncStorage.removeItem('@neighborhub_user_request_cache').catch((e) =>
      console.warn('[useZoneStore] Failed to clear request cache:', e)
    );
  },
}));
