// The main "Call to Action" button on the map.
// Redesigned to look like a Google Maps-style floating bottom action bar.
// All emojis removed — we use Lucide SVG icons exclusively.
// The button adapts based on where the user is standing: inside a zone = blue (auto-approve), outside = amber (manual review).

import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  MapPin,
  Check,
  Search,
  FileText,
  Home,
  AlertTriangle,
  Loader,
} from 'lucide-react-native';
import { useZoneStore } from '@/stores/useZoneStore';
import { submitJoinRequest } from '@/services/joinRequests';
import type { Zone, UserLocation } from '@/types/location';

interface JoinButtonProps {
  userLocation: UserLocation | null;
  activeZone: Zone | null;
  zones: Zone[];
  isLocationLoading: boolean;
  onSuccess?: () => void;
}

export function JoinButton({
  userLocation,
  activeZone,
  zones,
  isLocationLoading,
  onSuccess,
}: JoinButtonProps) {
  const isSubmitting = useZoneStore((s) => s.isSubmittingRequest);
  const joinRequestResult = useZoneStore((s) => s.joinRequestResult);
  const requestError = useZoneStore((s) => s.requestError);
  const setIsSubmitting = useZoneStore((s) => s.setIsSubmittingRequest);
  const setResult = useZoneStore((s) => s.setJoinRequestResult);
  const setError = useZoneStore((s) => s.setRequestError);

  const isInsideZone = activeZone !== null;
  const isRejected = joinRequestResult?.status === 'rejected';
  const hasResult = joinRequestResult !== null && !isRejected;

  // Fire off the join request when tapped.
  const handlePress = useCallback(async () => {
    if (!userLocation) {
      Alert.alert(
        'Location Required',
        'We need your location to process your join request. Please enable GPS and wait for a location fix.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitJoinRequest(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        zones
      );
      setResult(result);
      onSuccess?.();

      Alert.alert(
        result.status === 'approved' ? 'Request Approved' : 'Request Submitted',
        result.message,
        [{ text: 'Done' }]
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit your request. Please try again.';
      setError(errorMessage);
      Alert.alert('Something went wrong', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsSubmitting(false);
    }
  }, [userLocation, zones, isSubmitting, setIsSubmitting, setResult, setError, onSuccess]);

  // Pick the right icon for the current state
  const ButtonIcon = getButtonIcon({ isLocationLoading, userLocation, hasResult, isInsideZone, status: joinRequestResult?.status });

  const labelText = getLabelText({
    isLocationLoading,
    userLocation,
    isInsideZone,
    activeZone,
    isSubmitting,
    hasResult,
    status: joinRequestResult?.status,
  });

  const subtitleText = getSubtitleText({
    isLocationLoading,
    isInsideZone,
    activeZone,
    hasResult,
    status: joinRequestResult?.status,
  });

  const buttonVariant = getButtonVariant({ hasResult, isInsideZone, status: joinRequestResult?.status });

  return (
    <View style={styles.container}>

      {/* Zone status chip — sits above the main button like a Google Maps info pill */}
      {!isLocationLoading && userLocation && !hasResult && (
        <View style={[styles.statusChip, isInsideZone ? styles.chipInside : styles.chipOutside]}>
          <View style={[styles.chipDot, { backgroundColor: isInsideZone ? '#059669' : '#D97706' }]} />
          <Text style={[styles.chipText, isInsideZone ? styles.chipTextInside : styles.chipTextOutside]}>
            {isInsideZone ? `Inside ${activeZone?.name}` : 'Outside registered zones'}
          </Text>
        </View>
      )}

      {/* Error message strip */}
      {requestError && (
        <View style={styles.errorBox}>
          <AlertTriangle size={13} color="#EF4444" strokeWidth={2} />
          <Text style={styles.errorText}>{requestError}</Text>
        </View>
      )}

      {/* Rejection notice strip */}
      {isRejected && !requestError && (
        <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
          <AlertTriangle size={13} color="#EF4444" strokeWidth={2} />
          <Text style={[styles.errorText, { color: '#B91C1C' }]}>
            Your previous request was rejected. You may submit a new request if your coordinates or status have updated.
          </Text>
        </View>
      )}

      {/* Main action button */}
      <TouchableOpacity
        style={[styles.button, styles[buttonVariant], (isSubmitting || isLocationLoading || !userLocation || hasResult) && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={isSubmitting || isLocationLoading || !userLocation || hasResult}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={labelText}
        testID="join-request-button"
      >
        {isSubmitting ? (
          <View style={styles.row}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.buttonLabel}>Submitting…</Text>
          </View>
        ) : (
          <View style={styles.row}>
            <ButtonIcon size={20} color="#FFFFFF" strokeWidth={2.5} />
            <View style={styles.labelGroup}>
              <Text style={styles.buttonLabel}>{labelText}</Text>
              {subtitleText ? (
                <Text style={styles.buttonSubtitle}>{subtitleText}</Text>
              ) : null}
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* GPS accuracy disclaimer */}
      {userLocation?.accuracy && userLocation.accuracy > 50 && !hasResult && (
        <Text style={styles.accuracyNote}>
          GPS accuracy ~{Math.round(userLocation.accuracy)}m — move outdoors for a better reading
        </Text>
      )}
    </View>
  );
}

type Status = 'pending' | 'approved' | 'rejected' | 'under_review' | undefined;

type ButtonVariant = 'buttonInside' | 'buttonOutside' | 'buttonApproved' | 'buttonReview' | 'buttonPending' | 'buttonMuted';

function getButtonVariant(params: { hasResult: boolean; isInsideZone: boolean; status: Status }): ButtonVariant {
  const { hasResult, isInsideZone, status } = params;
  if (hasResult) {
    if (status === 'approved') return 'buttonApproved';
    if (status === 'under_review') return 'buttonReview';
    return 'buttonPending';
  }
  if (isInsideZone) return 'buttonInside';
  return 'buttonOutside';
}

function getButtonIcon(params: {
  isLocationLoading: boolean;
  userLocation: UserLocation | null;
  hasResult: boolean;
  isInsideZone: boolean;
  status: Status;
}) {
  const { isLocationLoading, userLocation, hasResult, isInsideZone, status } = params;
  if (isLocationLoading || !userLocation) return MapPin;
  if (hasResult) {
    if (status === 'approved') return Check;
    if (status === 'under_review') return Search;
    return FileText;
  }
  if (isInsideZone) return Home;
  return FileText;
}

function getLabelText(params: {
  isLocationLoading: boolean;
  userLocation: UserLocation | null;
  isInsideZone: boolean;
  activeZone: Zone | null;
  isSubmitting: boolean;
  hasResult: boolean;
  status: Status;
}): string {
  const { isLocationLoading, userLocation, isInsideZone, activeZone, isSubmitting, hasResult, status } = params;

  if (isLocationLoading) return 'Detecting location…';
  if (!userLocation) return 'Location required';
  if (isSubmitting) return 'Submitting…';
  if (hasResult) {
    if (status === 'approved') return 'Request Approved';
    if (status === 'under_review') return 'Under Review';
    return 'Request Submitted';
  }
  if (isInsideZone) return `Join ${activeZone?.name ?? 'Zone'}`;
  return 'Request Manual Review';
}

function getSubtitleText(params: {
  isLocationLoading: boolean;
  isInsideZone: boolean;
  activeZone: Zone | null;
  hasResult: boolean;
  status: Status;
}): string {
  const { isLocationLoading, isInsideZone, hasResult, status } = params;

  if (isLocationLoading) return '';
  if (hasResult) {
    if (status === 'approved') return "You're now a verified resident";
    if (status === 'under_review') return 'An admin will review your request shortly';
    return "We'll notify you when reviewed";
  }
  if (isInsideZone) return 'Tap to auto-approve your membership';
  return "You're outside our zones — an admin will review";
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 10,
    gap: 8,
  },
  // Zone status pill
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 24,
    gap: 6,
    borderWidth: 1,
  },
  chipInside: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  chipOutside: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  chipTextInside: { color: '#065F46' },
  chipTextOutside: { color: '#92400E' },

  // Error bar
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
    lineHeight: 18,
  },

  // Button core
  button: {
    borderRadius: 14,
    paddingVertical: 17,
    paddingHorizontal: 20,
    justifyContent: 'center',
    minHeight: 62,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 3px 6px rgba(0,0,0,0.1)',
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labelGroup: {
    flex: 1,
  },
  buttonDisabled: { opacity: 0.55 },

  // Button state variants — clean and high contrast light-mode values
  buttonInside:   { backgroundColor: '#2563EB' },   // vibrant blue — inside zone
  buttonOutside:  { backgroundColor: '#475569' },   // slate gray — outside zone
  buttonMuted:    { backgroundColor: '#94A3B8' },   // muted gray — loading/unknown
  buttonApproved: { backgroundColor: '#059669' },   // emerald green
  buttonReview:   { backgroundColor: '#D97706' },   // amber
  buttonPending:  { backgroundColor: '#64748B' },   // medium gray

  // Label text
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  buttonSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '400',
  },

  // GPS accuracy disclaimer
  accuracyNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#64748B',
    paddingHorizontal: 10,
    lineHeight: 16,
  },
});
