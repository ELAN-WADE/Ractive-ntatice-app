/**
 * Supabase client initialization.
 *
 * We use AsyncStorage for session persistence so users stay logged in
 * across app restarts — critical for a good Nigerian mobile experience
 * where app restarts due to memory pressure are common.
 *
 * The URL polyfill is needed for React Native's JS engine (Hermes/JSC),
 * which doesn't implement the URL class natively.
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ─── Environment Variables ────────────────────────────────────────────────────

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] Missing environment variables.\n' +
    'Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file.\n' +
    'Copy .env.example to .env and fill in your project credentials.'
  );
}

// ─── Client ───────────────────────────────────────────────────────────────────

/**
 * Typed Supabase client. The generic Database type provides full TypeScript
 * completion for all table operations and RPC calls.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage for persistent sessions on mobile
    storage: AsyncStorage,
    // Automatically refresh the token before expiry
    autoRefreshToken: true,
    // Persist the session across app restarts
    persistSession: true,
    // Disable the default browser-based OAuth flow
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-app-version': '1.0.0',
    },
  },
  // Nigerian networks can be slow — increase default timeouts
  // Note: Supabase JS v2 doesn't expose timeout directly; this is
  // handled via fetch options in each service call.
});

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

/**
 * Sign in with email and password.
 * Returns the session and user, or throws on error.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Register a new user with email and password.
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: {
      emailRedirectTo: undefined, // Disable email confirmation for simplicity
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the currently authenticated user.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.warn('[Supabase] Error getting current user:', error.message);
    return null;
  }
  return user;
}
