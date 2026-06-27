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
  TouchableOpacity,
} from 'react-native';
import MapView, {
  Polygon,
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { MapPin, AlertCircle, Locate } from 'lucide-react-native';
import { zoneToMapPolygonCoords, polygonCentroid } from '@/utils/geo';
import type { Zone, UserLocation } from '@/types/location';

const LAGOS_REGION: Region = {
  latitude: 6.4698,
  longitude: 3.4068,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

interface ZoneMapProps {
  zones: Zone[];
  userLocation: UserLocation | null;
  activeZone: Zone | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  onZonePress?: (zone: Zone) => void;
}

export function ZoneMap({
  zones,
  userLocation,
  activeZone,
  isLoadingLocation,
  locationError,
  onZonePress,
}: ZoneMapProps) {
  const mapRef = useRef<MapView>(null);

  // Fly the camera to the user's location
  const handleLocateUser = () => {
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
  };

  // Fly the camera to the user's location the moment we get a GPS lock.
  useEffect(() => {
    if (userLocation && mapRef.current) {
      handleLocateUser();
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
        showsMyLocationButton={false} // Disable default, use our styled custom button
        showsCompass={true}
        toolbarEnabled={false}
        loadingEnabled={true}
        loadingIndicatorColor="#0F172A"
        loadingBackgroundColor="#FFFFFF"
      >
        {/* Render each neighborhood zone polygon */}
        {zones.map((zone) => {
          const coords = zoneToMapPolygonCoords(zone);
          const isActive = activeZone?.id === zone.id;

          // Make the zone the user is currently standing inside slightly darker so it pops.
          const fillColor = hexToRgba(zone.color, isActive ? 0.30 : 0.12);
          const strokeColor = isActive ? zone.color : hexToRgba(zone.color, 0.6);

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
                { borderColor: isActive ? zone.color : '#E2E8F0' },
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

      {/* Custom Locate User floating button (Google Maps style) */}
      {userLocation && (
        <TouchableOpacity
          style={styles.locateButton}
          onPress={handleLocateUser}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Center map on my location"
        >
          <Locate size={20} color="#0F172A" strokeWidth={2} />
        </TouchableOpacity>
      )}

      {/* Location loading overlay — floats over the map */}
      {isLoadingLocation && (
        <View style={styles.locationOverlay}>
          <ActivityIndicator size="small" color="#64748B" />
          <Text style={styles.locationOverlayText}>Finding your location…</Text>
        </View>
      )}

      {/* Location error banner — uses AlertCircle SVG instead of emoji */}
      {locationError && !isLoadingLocation && (
        <View style={styles.errorBanner}>
          <AlertCircle size={14} color="#EF4444" strokeWidth={2} />
          <Text style={styles.errorBannerText}>{locationError}</Text>
        </View>
      )}
    </View>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    gap: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
      },
    }),
  },
  zoneLabelActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 3px 6px rgba(0,0,0,0.15)',
      },
    }),
  },
  zoneLabelDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  zoneLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  zoneLabelTextActive: {
    color: '#0F172A',
  },
  locateButton: {
    position: 'absolute',
    bottom: 230, // Floats cleanly above the bottom panel
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 3px 6px rgba(0,0,0,0.15)',
      },
    }),
  },
  locationOverlay: {
    position: 'absolute',
    bottom: 230,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  locationOverlayText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  errorBanner: {
    position: 'absolute',
    top: 90, // Positioned cleanly below the floating header
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 6px rgba(0,0,0,0.08)',
      },
    }),
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
    lineHeight: 18,
  },
});

