// Handles the logic for users requesting to join a neighborhood.
//
// How it works:
// 1. User taps "Join"
// 2. We do a fast local check (turf.js) to see if they're in a zone.
// 3. We ask the database to double-check their coordinates.
// 4. If the database agrees, they're approved. If the database disagrees with the app, we flag it for admin review (might be GPS drift or spoofing).
// 5. If they're totally outside, it goes to manual review.

import { supabase } from './supabase';
import { verifyZoneOnServer } from './zones';
import { findUserZone } from '@/utils/geo';
import type { Zone, Coordinates, JoinRequestResult, JoinRequestStatus } from '@/types/location';
import type { JoinRequestInsert } from '@/types/database';

// ─── Main Join Request Submission ─────────────────────────────────────────────

// The main function that fires when the user taps "Join".
// It checks both the phone and the database before saving the request.
export async function submitJoinRequest(
  coords: Coordinates,
  zones: Zone[]
): Promise<JoinRequestResult> {
  try {
    // ── 1. Get current user ──────────────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('You must be logged in to submit a join request.');
    }

    // Bypass server call for offline demo user
    if (user.id === 'offline-demo-user-id') {
      throw new Error('Failed to fetch (offline sandbox mode simulation)');
    }

    // ── 2. Client-side turf.js check (instant) ───────────────────────────────
    const clientMatchedZone = findUserZone(coords, zones);
    const clientZoneMatched = clientMatchedZone !== null;

    // ── 3. Server-side PostGIS check (authoritative, may be slow on 2G/3G) ──
    let serverZoneId: string | null = null;
    let serverZoneName: string | null = null;
    let serverZoneMatched = false;

    try {
      const serverResult = await verifyZoneOnServer(coords.latitude, coords.longitude);
      if (serverResult) {
        serverZoneMatched = serverResult.is_inside;
        serverZoneId = serverResult.zone_id;
        serverZoneName = serverResult.zone_name;
      }
    } catch (err) {
      // Server check failed — don't block the request, just flag it
      console.warn('[joinRequests] Server zone check failed, proceeding with client result');
    }

    // ── 4. Determine final zone and status ──────────────────────────────────
    const finalZoneId = serverZoneId ?? clientMatchedZone?.id ?? null;
    const finalZoneName = serverZoneName ?? clientMatchedZone?.name ?? null;
    const status = determineStatus(serverZoneMatched, clientZoneMatched);
    const reviewNote = buildReviewNote(serverZoneMatched, clientZoneMatched, finalZoneName);

    // ── 5. Insert into Supabase ──────────────────────────────────────────────
    const insertData: JoinRequestInsert = {
      user_id: user.id,
      zone_id: finalZoneId,
      location_geojson: {
        type: 'Point',
        coordinates: [coords.longitude, coords.latitude], // GeoJSON: [lng, lat]
      },
      latitude: coords.latitude,
      longitude: coords.longitude,
      client_zone_matched: clientZoneMatched,
      server_zone_matched: serverZoneMatched,
      status,
      review_note: reviewNote,
    };

    const { data, error } = await supabase
      .from('join_requests')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      // Handle duplicate request gracefully
      if (error.code === '23505') {
        throw new Error('You already have a pending join request.');
      }
      throw new Error(`Failed to submit request: ${error.message}`);
    }

    // data is guaranteed non-null here — error guard above ensures it
    const row = data as { id: string };
    const result = {
      requestId: row.id,
      status,
      message: getStatusMessage(status, finalZoneName),
      zoneId: finalZoneId,
      zoneName: finalZoneName,
    };

    await saveRequestToCache({
      id: result.requestId,
      user_id: user.id,
      zone_id: result.zoneId,
      status: result.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return result;
  } catch (err: unknown) {
    const isFetchError =
      err instanceof Error &&
      (err.message.includes('Failed to fetch') ||
        err.message.includes('Network request failed') ||
        err.message.includes('network error') ||
        err.message.includes('offline'));

    if (isFetchError) {
      console.warn('[joinRequests] Offline/network error. Simulating join request locally.');
      const clientMatchedZone = findUserZone(coords, zones);
      const clientZoneMatched = clientMatchedZone !== null;
      const finalZoneName = clientMatchedZone?.name ?? null;
      const finalZoneId = clientMatchedZone?.id ?? null;

      const status: JoinRequestStatus = clientZoneMatched ? 'approved' : 'pending';
      const message = clientZoneMatched
        ? `Welcome to ${finalZoneName}! Your request has been auto-approved (Offline Mode).`
        : `You are outside registered zones. Request submitted for manual review (Offline Mode).`;

      const result = {
        requestId: 'offline-demo-request-id-' + Date.now(),
        status,
        message,
        zoneId: finalZoneId,
        zoneName: finalZoneName,
      };

      await saveRequestToCache({
        id: result.requestId,
        user_id: 'offline-demo-user-id',
        zone_id: result.zoneId,
        status: result.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return result;
    }
    throw err;
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

// Decides what the status of the request should be based on the checks.
function determineStatus(
  serverMatched: boolean,
  clientMatched: boolean
): JoinRequestStatus {
  if (serverMatched) {
    // Server confirms user is in a zone — auto-approve
    return 'approved';
  }
  if (clientMatched && !serverMatched) {
    // Client says yes, server says no (or server failed) — flag for review
    // This could be GPS drift near zone boundary or spoofing attempt
    return 'under_review';
  }
  // Neither matched — needs manual admin review
  return 'pending';
}

// Leaves a handy note for the admin in the database explaining why it was flagged or approved.
function buildReviewNote(
  serverMatched: boolean,
  clientMatched: boolean,
  zoneName: string | null
): string {
  if (serverMatched) {
    return `Auto-approved: Server-side PostGIS confirmed user is inside "${zoneName}".`;
  }
  if (clientMatched && !serverMatched) {
    return `Flagged: Client-side check matched "${zoneName}" but server-side PostGIS did not confirm. May be GPS boundary drift or spoofing.`;
  }
  return 'Flagged for manual review: User coordinates are outside all registered zones.';
}

// Gives the user a friendly popup message explaining what happened.
function getStatusMessage(status: JoinRequestStatus, zoneName: string | null): string {
  switch (status) {
    case 'approved':
      return `Welcome to ${zoneName ?? 'the neighborhood'}! Your request has been auto-approved.`;
    case 'under_review':
      return `Your location is near the ${zoneName ?? 'zone'} boundary. An admin will review your request shortly.`;
    case 'pending':
    default:
      return "You're outside our registered zones. Your request has been submitted for manual review.";
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const REQUEST_CACHE_KEY = '@neighborhub_user_request_cache';

async function getCachedRequest() {
  try {
    const json = await AsyncStorage.getItem(REQUEST_CACHE_KEY);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.warn('[joinRequests] Failed to load request cache:', e);
    return null;
  }
}

export async function saveRequestToCache(request: any) {
  try {
    await AsyncStorage.setItem(REQUEST_CACHE_KEY, JSON.stringify(request));
  } catch (e) {
    console.warn('[joinRequests] Failed to save request cache:', e);
  }
}

// ─── Query Functions ──────────────────────────────────────────────────────────

// Checks if the user already has a pending request so we can update the button UI.
// Quietly falls back to local cache if network is down or offline.
export async function getUserJoinRequest() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    if (user.id === 'offline-demo-user-id') {
      return getCachedRequest();
    }

    const { data, error } = await supabase
      .from('join_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[joinRequests] Error fetching user request, trying cache:', error.message);
      return getCachedRequest();
    }

    if (data) {
      await saveRequestToCache(data);
    }
    return data;
  } catch (err) {
    console.warn('[joinRequests] Network or auth error checking for existing user request, trying cache:', err);
    return getCachedRequest();
  }
}
