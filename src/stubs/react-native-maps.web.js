/**
 * Web stub for react-native-maps.
 *
 * Implements a fully interactive, lightweight Leaflet.js map for the web browser.
 * It renders zone polygons, custom location marker labels, user location pulsing dot,
 * and allows clicking/tapping anywhere on the map to set a mock location for developer testing.
 */

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import { useZoneStore } from '@/stores/useZoneStore';

// ── No-op component stubs ─────────────────────────────────────────────────────
const NoopComponent = () => null;

export const Marker = NoopComponent;
export const Polygon = NoopComponent;
export const Polyline = NoopComponent;
export const Circle = NoopComponent;
export const Callout = NoopComponent;
export const Overlay = NoopComponent;
export const Heatmap = NoopComponent;
export const Geojson = NoopComponent;

// Provider constants
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;

// Animated region no-op
export const AnimatedRegion = class {
  constructor(region) {
    Object.assign(this, region);
  }
  timing() {
    return { start: () => {} };
  }
};

// ── Interactive Map View for Web ────────────────────────────────────────────────

const MapViewStub = forwardRef(({ style, initialRegion, showsUserLocation, children }, ref) => {
  const iframeRef = useRef(null);
  const zones = useZoneStore((s) => s.zones);

  const lat = initialRegion?.latitude ?? 6.4698;
  const lng = initialRegion?.longitude ?? 3.4068;

  // Let parent components animate the map camera via postMessage
  useImperativeHandle(ref, () => ({
    animateToRegion: (region) => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'ANIMATE_TO_REGION',
            region,
          },
          '*'
        );
      }
    },
  }));

  // Listen to events coming from the Leaflet iframe
  useEffect(() => {
    const handleMessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'ZONE_CLICK') {
        // Match zone click and trigger onPress on matching children
        React.Children.forEach(children, (child) => {
          if (child && child.props && typeof child.props.onPress === 'function') {
            if (child.key === data.zoneId || child.key === `label-${data.zoneId}`) {
              child.props.onPress();
            }
          }
        });
      } else if (data.type === 'USER_LOCATION_MANUAL') {
        // Tapping on the map sets a simulated/mock user location for dev testing
        const simulatedLocation = {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: 10,
          timestamp: Date.now(),
        };
        console.log('[MapWeb] Setting simulated user location:', simulatedLocation);
        useZoneStore.getState().setUserLocation(simulatedLocation);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [children]);

  // Build Leaflet HTML
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
    }
    .custom-zone-label {
      background: transparent;
      border: none;
    }
    .user-location-marker {
      background: transparent;
      border: none;
    }
    .pulse-dot {
      width: 10px;
      height: 10px;
      background-color: #3B82F6;
      border: 2px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 4px rgba(0,0,0,0.3);
    }
    .pulse-ring {
      width: 22px;
      height: 22px;
      border: 2px solid #3B82F6;
      border-radius: 50%;
      background-color: rgba(59, 130, 246, 0.15);
      position: absolute;
      top: -6px;
      left: -6px;
      animation: pulse 2s infinite ease-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    /* Info badge styling */
    .dev-badge {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.95);
      padding: 6px 12px;
      border-radius: 20px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      z-index: 1000;
      pointer-events: none;
      border: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dev-badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #10B981;
    }
  </style>
</head>
<body>
  <div class="dev-badge">
    <div class="dev-badge-dot"></div>
    <span>Web Dev Mode: Click anywhere on map to mock GPS location</span>
  </div>
  <div id="map"></div>
  <script>
    var initialLat = ${lat};
    var initialLng = ${lng};
    var map = L.map('map', { zoomControl: false }).setView([initialLat, initialLng], 13);

    // Light-themed minimal map tile layer matching our branding
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '© CartoDB'
    }).addTo(map);

    // Draw Polygons and labels from active store zones
    var zones = ${JSON.stringify(zones)};
    zones.forEach(function(zone) {
      if (!zone.geojson || !zone.geojson.coordinates) return;
      
      var coordinates = zone.geojson.coordinates[0];
      var latLngs = coordinates.map(function(c) {
        return [c[1], c[0]]; // convert GeoJSON [lng, lat] to Leaflet [lat, lng]
      });

      var poly = L.polygon(latLngs, {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.12,
        weight: 2
      }).addTo(map);

      poly.on('click', function() {
        window.parent.postMessage({ type: 'ZONE_CLICK', zoneId: zone.id }, '*');
      });
      
      // Calculate Centroid
      var centroidLat = 0;
      var centroidLng = 0;
      latLngs.forEach(function(ll) {
        centroidLat += ll[0];
        centroidLng += ll[1];
      });
      centroidLat /= latLngs.length;
      centroidLng /= latLngs.length;

      // Add custom label marker
      var labelIcon = L.divIcon({
        className: 'custom-zone-label',
        html: '<div style="background-color: white; border: 1px solid #E2E8F0; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; color: #64748B; display: flex; align-items: center; gap: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); white-space: nowrap;"><div style="width: 7px; height: 7px; border-radius: 50%; background-color: ' + zone.color + ';"></div>' + zone.name + '</div>',
        iconAnchor: [50, 10]
      });

      var marker = L.marker([centroidLat, centroidLng], { icon: labelIcon }).addTo(map);
      marker.on('click', function() {
        window.parent.postMessage({ type: 'ZONE_CLICK', zoneId: zone.id }, '*');
      });
    });

    // Handle Geolocation pulsing dot
    var showsUserLocation = ${showsUserLocation ? 'true' : 'false'};
    var userMarker = null;

    if (showsUserLocation && navigator.geolocation) {
      navigator.geolocation.watchPosition(function(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        var latlng = [lat, lng];

        if (!userMarker) {
          var pulsingIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="pulse-dot"></div><div class="pulse-ring"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          });
          userMarker = L.marker(latlng, { icon: pulsingIcon }).addTo(map);
        } else {
          userMarker.setLatLng(latlng);
        }
      }, function(err) {
        console.warn('[MapWeb] Geolocation error:', err);
      }, { enableHighAccuracy: true });
    }

    // Capture map clicks to update user's simulated GPS location
    map.on('click', function(e) {
      var clickLat = e.latlng.lat;
      var clickLng = e.latlng.lng;

      // Draw local simulated location marker instantly for visual feedback
      if (!userMarker) {
        var pulsingIcon = L.divIcon({
          className: 'user-location-marker',
          html: '<div class="pulse-dot"></div><div class="pulse-ring"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        userMarker = L.marker([clickLat, clickLng], { icon: pulsingIcon }).addTo(map);
      } else {
        userMarker.setLatLng([clickLat, clickLng]);
      }

      window.parent.postMessage({
        type: 'USER_LOCATION_MANUAL',
        latitude: clickLat,
        longitude: clickLng
      }, '*');
    });

    // Handle messages from parent React app
    window.addEventListener('message', function(event) {
      var data = event.data;
      if (data && data.type === 'ANIMATE_TO_REGION') {
        var r = data.region;
        map.flyTo([r.latitude, r.longitude], 14, { animate: true, duration: 0.8 });
      }
    });
  </script>
</body>
</html>
  `;

  const flatStyle = StyleSheet.flatten(style);

  return (
    <iframe
      ref={iframeRef}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        ...flatStyle,
      }}
      srcDoc={htmlContent}
      sandbox="allow-scripts allow-same-origin"
    />
  );
});

MapViewStub.displayName = 'MapView';

export default MapViewStub;
