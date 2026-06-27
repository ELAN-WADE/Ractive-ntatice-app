// Caches zone boundaries so we aren't pinging Supabase every time the user opens the map.
// This is super important for users on spotty 3G networks so they don't stare at loading spinners.
// We also track their GPS location here.

import { create } from 'zustand';
import { fetchZones } from '@/services/zones';
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

      set({
        zones,
        isLoadingZones: false,
        lastFetchedAt: Date.now(),
      });
    } catch (err: any) {
      set({
        zonesError: err?.message ?? 'Failed to load zones.',
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

  clearRequestState: () => set({
    joinRequestResult: null,
    isSubmittingRequest: false,
    requestError: null,
  }),
}));
