// Main map screen — redesigned with a Google Maps-inspired layout.
// The map fills the entire screen. UI elements (header, status chips, bottom panel) float above it.
// All emojis removed. SVG icons used throughout via lucide-react-native.

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LogOut, CheckCircle2, MapPin, X, Search, FileText } from 'lucide-react-native';
import { ZoneMap } from '@/components/map/ZoneMap';
import { JoinButton } from '@/components/map/JoinButton';
import { useLocation } from '@/hooks/useLocation';
import { useZones } from '@/hooks/useZones';
import { useAuthStore } from '@/stores/useAuthStore';
import { useZoneStore } from '@/stores/useZoneStore';
import { submitJoinRequest } from '@/services/joinRequests';
import type { Zone } from '@/types/location';

export default function MapScreen() {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const insets = useSafeAreaInsets();

  // Auth
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  // Location
  const { location, isLoading: isLocationLoading, error: locationError, refresh: refreshLocation } = useLocation();

  // Zones (from Supabase, cached via Zustand, includes derived activeZone)
  const { zones, activeZone, isLoading: isZonesLoading, refetch: refetchZones } = useZones();

  const clearRequestState = useZoneStore((s) => s.clearRequestState);
  const joinRequestResult = useZoneStore((s) => s.joinRequestResult);
  const isSubmitting = useZoneStore((s) => s.isSubmittingRequest);
  const setIsSubmitting = useZoneStore((s) => s.setIsSubmittingRequest);
  const setResult = useZoneStore((s) => s.setJoinRequestResult);
  const setRequestError = useZoneStore((s) => s.setRequestError);

  // Auto-submit and notify when the user enters a zone boundary
  useEffect(() => {
    // Only fire if we are physically inside a zone, have a valid GPS lock, 
    // and haven't already processed a join request.
    if (activeZone && location && !joinRequestResult && !isSubmitting) {
      (async () => {
        setIsSubmitting(true);
        setRequestError(null);
        try {
          const result = await submitJoinRequest(
            { latitude: location.latitude, longitude: location.longitude },
            zones
          );
          setResult(result);
          
          // Trigger the system push notification / alert
          if (Platform.OS === 'web') {
            window.alert(`Entered Zone!\nYou just walked into ${activeZone.name}.\n\n${result.message}`);
          } else {
            Alert.alert(
              'Entered Zone!',
              `You just walked into ${activeZone.name}.\n\n${result.message}`,
              [{ text: 'Awesome' }]
            );
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to auto-submit request.';
          setRequestError(errorMessage);
        } finally {
          setIsSubmitting(false);
        }
      })();
    }
  }, [activeZone, location, joinRequestResult, isSubmitting, zones, setIsSubmitting, setResult, setRequestError]);

  // Show bottom sheet on zone tap
  const handleZonePress = useCallback((zone: Zone) => {
    setSelectedZone(zone);
  }, []);

  // Confirm sign out
  const handleSignOut = useCallback(() => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        clearRequestState();
        signOut();
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              clearRequestState();
              await signOut();
            },
          },
        ]
      );
    }
  }, [signOut, clearRequestState]);

  const handleJoinSuccess = useCallback(() => {
    // Placeholder for analytics / confetti
  }, []);

  const userInitial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const userEmail = user?.email ?? '';

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Map (full screen, no borders) */}
      <ZoneMap
        zones={zones}
        userLocation={location}
        activeZone={activeZone}
        isLoadingLocation={isLocationLoading}
        locationError={locationError}
        onZonePress={handleZonePress}
      />

      {/* Floating header over the map */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>NeighborHUB</Text>
            <Text style={styles.headerSubtitle}>
              {isZonesLoading
                ? 'Loading zones…'
                : `${zones.length} active neighborhood${zones.length !== 1 ? 's' : ''}`}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* User avatar */}
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => setShowProfileModal(true)}
              testID="btn-user-profile"
              accessibilityLabel="View profile"
            >
              <Text style={styles.avatarText}>{userInitial}</Text>
            </TouchableOpacity>

            {/* Sign out */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleSignOut}
              testID="btn-sign-out"
              accessibilityLabel="Sign out"
            >
              <LogOut size={18} color="#475569" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Floating bottom panel - Google Maps style */}
      <View style={[styles.bottomPanel, { bottom: insets.bottom + 8 }]}>
        <View style={styles.bottomPanelCard}>
          {/* Active zone badge */}
          {activeZone && (
            <View style={styles.activeZoneBadge}>
              <View style={[styles.activeZoneDot, { backgroundColor: activeZone.color }]} />
              <Text style={styles.activeZoneName}>Inside: {activeZone.name}</Text>
            </View>
          )}

          {/* User email pill */}
          <Text style={styles.userEmail} numberOfLines={1}>
            {userEmail}
          </Text>

          {/* Join request button */}
          <JoinButton
            userLocation={location}
            activeZone={activeZone}
            zones={zones}
            isLocationLoading={isLocationLoading}
            onSuccess={handleJoinSuccess}
          />
        </View>
      </View>

      {/* Zone detail bottom sheet modal */}
      <Modal
        visible={selectedZone !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedZone(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedZone(null)}>
          <Pressable style={[styles.modalCard, { paddingBottom: insets.bottom + 24 }]} onPress={() => {}}>
            {selectedZone && (
              <>
                {/* Drag handle */}
                <View style={styles.modalHandle} />

                {/* Header row with close button */}
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalTitleGroup}>
                    <View style={[styles.modalColorSwatch, { backgroundColor: selectedZone.color }]} />
                    <Text style={styles.modalTitle}>{selectedZone.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseIcon}
                    onPress={() => setSelectedZone(null)}
                  >
                    <X size={18} color="#64748B" strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                {/* Description */}
                {selectedZone.description && (
                  <Text style={styles.modalDescription}>{selectedZone.description}</Text>
                )}

                {/* Info rows */}
                <View style={styles.infoTable}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Zone ID</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{selectedZone.id}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status</Text>
                    {activeZone?.id === selectedZone.id ? (
                      <View style={styles.statusBadgeInside}>
                        <CheckCircle2 size={12} color="#059669" strokeWidth={2.5} />
                        <Text style={styles.statusBadgeTextInside}>You are here</Text>
                      </View>
                    ) : (
                      <View style={styles.statusBadgeOutside}>
                        <MapPin size={12} color="#64748B" strokeWidth={2} />
                        <Text style={styles.statusBadgeTextOutside}>Outside zone</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Close button */}
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedZone(null)}
                >
                  <Text style={styles.modalCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* User Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowProfileModal(false)}>
          <Pressable style={[styles.modalCard, { paddingBottom: insets.bottom + 24 }]} onPress={() => {}}>
            {/* Drag handle */}
            <View style={styles.modalHandle} />

            {/* Header row with close button */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Resident Profile</Text>
              <TouchableOpacity
                style={styles.modalCloseIcon}
                onPress={() => setShowProfileModal(false)}
              >
                <X size={18} color="#64748B" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Large Avatar Centered */}
            <View style={styles.profileAvatarContainer}>
              <View style={styles.profileLargeAvatar}>
                <Text style={styles.profileLargeAvatarText}>{userInitial}</Text>
              </View>
              <Text style={styles.profileEmail}>{userEmail}</Text>
              
              {/* Badge based on request result status */}
              {joinRequestResult?.status === 'approved' ? (
                <View style={styles.profileStatusBadgeApproved}>
                  <CheckCircle2 size={12} color="#059669" strokeWidth={2.5} />
                  <Text style={styles.profileStatusBadgeTextApproved}>
                    Verified Resident ({joinRequestResult.zoneName})
                  </Text>
                </View>
              ) : joinRequestResult?.status === 'under_review' ? (
                <View style={styles.profileStatusBadgePending}>
                  <Search size={12} color="#D97706" strokeWidth={2.5} />
                  <Text style={styles.profileStatusBadgeTextPending}>
                    Verification Pending ({joinRequestResult.zoneName})
                  </Text>
                </View>
              ) : joinRequestResult?.status === 'pending' ? (
                <View style={styles.profileStatusBadgePending}>
                  <FileText size={12} color="#D97706" strokeWidth={2.5} />
                  <Text style={styles.profileStatusBadgeTextPending}>
                    Manual Review Pending
                  </Text>
                </View>
              ) : (
                <View style={styles.profileStatusBadgeGuest}>
                  <MapPin size={12} color="#64748B" strokeWidth={2} />
                  <Text style={styles.profileStatusBadgeTextGuest}>
                    Unverified Resident (Guest)
                  </Text>
                </View>
              )}
            </View>

            {/* Details Table */}
            <View style={styles.infoTable}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Resident ID</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {user?.id ?? 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Joined Date</Text>
                <Text style={styles.infoValue}>
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.profileActionRow}>
              <TouchableOpacity
                style={styles.profileLogoutBtn}
                onPress={() => {
                  setShowProfileModal(false);
                  handleSignOut();
                }}
              >
                <Text style={styles.profileLogoutBtnText}>Sign Out</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileCloseBtn}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={styles.profileCloseBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-screen root
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Floating header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 6px rgba(0,0,0,0.05)',
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 768,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'RobotoCondensed-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Floating bottom panel
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  bottomPanelCard: {
    width: '92%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 6px 16px rgba(0,0,0,0.12)',
      },
    }),
  },
  activeZoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
    marginBottom: 6,
  },
  activeZoneDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  activeZoneName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    letterSpacing: 0.1,
  },
  userEmail: {
    textAlign: 'center',
    fontSize: 11,
    color: '#64748B',
    paddingHorizontal: 20,
    marginBottom: 4,
    fontWeight: '500',
  },

  // Zone detail bottom sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomWidth: 0,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0px -4px 12px rgba(0,0,0,0.08)',
      },
    }),
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalColorSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalCloseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },

  // Info table inside the bottom sheet
  infoTable: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 12,
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    maxWidth: '60%',
    textAlign: 'right',
  },

  // Status badges inside the modal
  statusBadgeInside: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeTextInside: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  statusBadgeOutside: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBadgeTextOutside: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Close button
  modalCloseBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },

  // Profile styles
  profileAvatarContainer: {
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  profileLargeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  profileLargeAvatarText: {
    fontFamily: 'RobotoCondensed-Bold',
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  profileStatusBadgeApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  profileStatusBadgeTextApproved: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  profileStatusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  profileStatusBadgeTextPending: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
  },
  profileStatusBadgeGuest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileStatusBadgeTextGuest: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  profileActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  profileLogoutBtn: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  profileLogoutBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  profileCloseBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  profileCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
