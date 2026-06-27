// Login and Registration screen.
// Completely redesigned with a premium monochromatic dark theme.
// No emojis — we use Lucide SVG icons throughout.
// Big touch targets, minimal visual noise, and sharp typographic hierarchy.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Map, AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '@/stores/useAuthStore';

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const clearError = useAuthStore((s) => s.clearError);

  const error = localError ?? storeError;

  // Run some basic checks before hitting the network to save time and bandwidth.
  const validate = useCallback((): boolean => {
    setLocalError(null);
    clearError();

    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setLocalError('Please enter a valid email address.');
      return false;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return false;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return false;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return false;
    }

    return true;
  }, [email, password, confirmPassword, mode, clearError]);

  // Trigger the actual Supabase auth call.
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
    } catch {
      // Error is already set in the store
    }
  }, [mode, email, password, validate, signIn, signUp]);

  // Switch between 'Sign In' and 'Create Account' modes, resetting any lingering errors.
  const toggleMode = useCallback(() => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setLocalError(null);
    clearError();
  }, [clearError]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Branding — SVG icon, no emoji */}
        <View style={styles.branding}>
          <View style={styles.logoCircle}>
            <Map size={32} color="#E2E8F0" strokeWidth={1.5} />
          </View>
          <Text style={styles.appName}>NeighborHub</Text>
          <Text style={styles.tagline}>Verify your neighborhood, connect with your community</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Mode toggle tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === 'signin' && styles.tabActive]}
              onPress={() => { setMode('signin'); clearError(); setLocalError(null); }}
              testID="tab-signin"
            >
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => { setMode('signup'); clearError(); setLocalError(null); }}
              testID="tab-signup"
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error box — AlertCircle SVG, no emoji */}
          {error && (
            <View style={styles.errorBox} testID="error-box">
              <AlertCircle size={14} color="#FCA5A5" strokeWidth={2} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#334155"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              testID="input-email"
            />
          </View>

          {/* Password field with show/hide toggle */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#334155"
                secureTextEntry={!showPassword}
                returnKeyType={mode === 'signup' ? 'next' : 'done'}
                onSubmitEditing={mode === 'signin' ? handleSubmit : undefined}
                testID="input-password"
              />
              <Pressable
                style={styles.showPasswordBtn}
                onPress={() => setShowPassword((s) => !s)}
              >
                {showPassword
                  ? <EyeOff size={18} color="#64748B" strokeWidth={2} />
                  : <Eye size={18} color="#64748B" strokeWidth={2} />
                }
              </Pressable>
            </View>
          </View>

          {/* Confirm password — signup only */}
          {mode === 'signup' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#334155"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                testID="input-confirm-password"
              />
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            testID="btn-submit"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle link */}
          <TouchableOpacity onPress={toggleMode} style={styles.toggleLink} testID="btn-toggle-mode">
            <Text style={styles.toggleLinkText}>
              {mode === 'signin'
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you agree to verify your neighborhood membership.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // near-black — cleaner than the old slate
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 56,
  },

  // ── Branding block
  branding: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },

  // ── Card
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },

  // ── Mode tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  tabTextActive: {
    color: '#CBD5E1',
  },

  // ── Error box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(30, 10, 10, 0.9)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FCA5A5',
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Form fields
  fieldGroup: {
    gap: 7,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F1F5F9',
    flex: 1,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passwordInput: {
    flex: 1,
  },
  showPasswordBtn: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Submit button
  submitBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 54,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── Toggle link
  toggleLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleLinkText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },

  // ── Footer
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#1E293B',
    marginTop: 28,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
