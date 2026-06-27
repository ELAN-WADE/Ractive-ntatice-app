// Renders the actual map and draws the neighborhood borders on top of it.
//
// Notes:
// - We force Google Maps on Android because it performs way better in Nigeria (caching is better).
// - We center on Lagos by default so the map doesn't load in the middle of the ocean.
// - Error banner uses a proper SVG icon instead of the old 📍 emoji.

import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, {
  Polygon,
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { MapPin, AlertCircle } from 'lucide-react-native';
import { zoneToMapPolygonCoords, polygonCentroid } from '@/utils/geo';
import type { Zone, UserLocation } from '@/types/location';

// ─── Constants ────────────────────────────────────────────────────────────────

const LAGOS_REGION: Region = {
  latitude: 6.4698,
  longitude: 3.4068,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ZoneMapProps {
  zones: Zone[];
  userLocation: UserLocation | null;
  activeZone: Zone | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  onZonePress?: (zone: Zone) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ZoneMap({
  zones,
  userLocation,
  activeZone,
  isLoadingLocation,
  locationError,
  onZonePress,
}: ZoneMapProps) {
  const mapRef = useRef<MapView>(null);

  // Fly the camera to the user's location the moment we get a GPS lock.
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        800
      );
    }
  }, [userLocation?.latitude, userLocation?.longitude]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={LAGOS_REGION}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        toolbarEnabled={false}
        loadingEnabled={true}
        loadingIndicatorColor="#E2E8F0"
        loadingBackgroundColor="#0F172A"
      >
        {/* Render each neighborhood zone polygon */}
        {zones.map((zone) => {
          const coords = zoneToMapPolygonCoords(zone);
          const isActive = activeZone?.id === zone.id;

          // Make the zone the user is currently standing inside slightly darker so it pops.
          const fillColor = hexToRgba(zone.color, isActive ? 0.35 : 0.18);
          const strokeColor = isActive ? zone.color : hexToRgba(zone.color, 0.8);

          return (
            <Polygon
              key={zone.id}
              coordinates={coords}
              fillColor={fillColor}
              strokeColor={strokeColor}
              strokeWidth={isActive ? 3 : 2}
              tappable={true}
              onPress={() => onZonePress?.(zone)}
            />
          );
        })}

        {/* Zone name labels as markers at polygon centroids */}
        {zones.map((zone) => {
          const coords = zoneToMapPolygonCoords(zone);
          const centroid = polygonCentroid(coords);
          const isActive = activeZone?.id === zone.id;

          return (
            <Marker
              key={`label-${zone.id}`}
              coordinate={centroid}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              onPress={() => onZonePress?.(zone)}
            >
              <View style={[
                styles.zoneLabel,
                { borderColor: isActive ? zone.color : 'rgba(255,255,255,0.15)' },
                isActive && styles.zoneLabelActive,
              ]}>
                <View style={[styles.zoneLabelDot, { backgroundColor: zone.color }]} />
                <Text style={[styles.zoneLabelText, isActive && styles.zoneLabelTextActive]}>
                  {zone.name}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Location loading overlay — floats over the map */}
      {isLoadingLocation && (
        <View style={styles.locationOverlay}>
          <ActivityIndicator size="small" color="#94A3B8" />
          <Text style={styles.locationOverlayText}>Finding your location…</Text>
        </View>
      )}

      {/* Location error banner — uses AlertCircle SVG instead of emoji */}
      {locationError && !isLoadingLocation && (
        <View style={styles.errorBanner}>
          <AlertCircle size={14} color="#FCA5A5" strokeWidth={2} />
          <Text style={styles.errorBannerText}>{locationError}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  zoneLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    gap: 5,
  },
  zoneLabelActive: {
    backgroundColor: 'rgba(2, 6, 23, 0.97)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  zoneLabelDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  zoneLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.2,
  },
  zoneLabelTextActive: {
    color: '#F1F5F9',
  },
  locationOverlay: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.92)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  locationOverlayText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  errorBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(30, 10, 10, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#FCA5A5',
    fontWeight: '500',
    lineHeight: 18,
  },
});
