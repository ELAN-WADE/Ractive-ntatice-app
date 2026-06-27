// Global state for user authentication.
// We hook this up to Supabase so it automatically keeps track of whether
// the user is logged in, logged out, or if their token refreshed.

import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import type { User, Session } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<() => void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  // Grab the saved session on startup and start listening to Supabase.
  // This gets called exactly once in the root layout.
  initialize: async () => {
    set({ isLoading: true });

    try {
      // Try to grab the session we saved from the last time they opened the app
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        user: session?.user ?? null,
        isInitialized: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isInitialized: true, isLoading: false });
    }

    // Keep listening in the background in case their token expires or they log out elsewhere
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error) throw error;
      set({ user: data.user, session: data.session, isLoading: false });
    } catch (err: any) {
      const message = err?.message ?? 'Sign in failed. Please try again.';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error) throw error;
      // Note: If email confirmation is required by Supabase, session might be null here.
      set({
        user: data.user,
        session: data.session,
        isLoading: false,
      });
    } catch (err: any) {
      const message = err?.message ?? 'Sign up failed. Please try again.';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
