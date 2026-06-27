// Main map screen — redesigned with a Google Maps-inspired layout.
// The map fills the entire screen. UI elements (header, status chips, bottom panel) float above it.
// All emojis removed. SVG icons used throughout via lucide-react-native.

import React, { useCallback, useState } from 'react';
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
import { LogOut, CheckCircle2, MapPin, X } from 'lucide-react-native';
import { ZoneMap } from '@/components/map/ZoneMap';
import { JoinButton } from '@/components/map/JoinButton';
import { useLocation } from '@/hooks/useLocation';
import { useZones } from '@/hooks/useZones';
import { useAuthStore } from '@/stores/useAuthStore';
import { useZoneStore } from '@/stores/useZoneStore';
import type { Zone } from '@/types/location';

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const insets = useSafeAreaInsets();

  // Auth
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  // Location
  const { location, isLoading: isLocationLoading, error: locationError, refresh: refreshLocation } = useLocation();

  // Zones (from Supabase, cached via Zustand, includes derived activeZone)
  const { zones, activeZone, isLoading: isZonesLoading, refetch: refetchZones } = useZones();

  const clearRequestState = useZoneStore((s) => s.clearRequestState);

  // ── Zone press (shows detail bottom sheet)
  const handleZonePress = useCallback((zone: Zone) => {
    setSelectedZone(zone);
  }, []);

  // ── Sign out confirmation
  const handleSignOut = useCallback(() => {
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
  }, [signOut, clearRequestState]);

  const handleJoinSuccess = useCallback(() => {
    // Placeholder for analytics / confetti
  }, []);

  const userInitial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const userEmail = user?.email ?? '';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Map (full screen, no borders) */}
      <ZoneMap
        zones={zones}
        userLocation={location}
        activeZone={activeZone}
        isLoadingLocation={isLocationLoading}
        locationError={locationError}
        onZonePress={handleZonePress}
      />

      {/* ── Floating header — sits above the map */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>NeighborHub</Text>
            <Text style={styles.headerSubtitle}>
              {isZonesLoading
                ? 'Loading zones…'
                : `${zones.length} zone${zones.length !== 1 ? 's' : ''} active`}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* User avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>

            {/* Sign out */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleSignOut}
              testID="btn-sign-out"
              accessibilityLabel="Sign out"
            >
              <LogOut size={18} color="#94A3B8" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Floating bottom panel — Google Maps style */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 8 }]}>
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

      {/* ── Zone detail bottom sheet modal */}
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
                        <CheckCircle2 size={12} color="#34D399" strokeWidth={2.5} />
                        <Text style={styles.statusBadgeTextInside}>You are here</Text>
                      </View>
                    ) : (
                      <View style={styles.statusBadgeOutside}>
                        <MapPin size={12} color="#94A3B8" strokeWidth={2} />
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Full-screen root — map fills everything
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },

  // ── Floating header — glassy dark pill over the map
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#475569',
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
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Floating bottom panel
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  activeZoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.07)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.18)',
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
    color: '#34D399',
    letterSpacing: 0.1,
  },
  userEmail: {
    textAlign: 'center',
    fontSize: 11,
    color: '#334155',
    paddingHorizontal: 20,
    marginBottom: 4,
    fontWeight: '500',
  },

  // ── Zone detail bottom sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderBottomWidth: 0,
    gap: 14,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  modalCloseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },

  // ── Info table inside the bottom sheet
  infoTable: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    maxWidth: '60%',
    textAlign: 'right',
  },

  // Status badges inside the modal
  statusBadgeInside: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.18)',
  },
  statusBadgeTextInside: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: '600',
  },
  statusBadgeOutside: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(148, 163, 184, 0.07)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  statusBadgeTextOutside: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── Close button at the bottom of the sheet
  modalCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
});
