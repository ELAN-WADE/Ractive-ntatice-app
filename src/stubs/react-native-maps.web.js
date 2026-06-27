/**
 * Web stub for react-native-maps.
 *
 * react-native-maps is a native module — it has no web implementation.
 * When Metro bundles for web, it tries to resolve react-native internals
 * (like Platform, NativeModules) that don't exist in the browser.
 *
 * This stub exports the same API surface as react-native-maps but with
 * no-op / placeholder components so the web bundle compiles cleanly.
 * The map will simply not render on web — use Expo Go on mobile instead.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ── Placeholder map view ──────────────────────────────────────────────────────

const MapViewStub = ({ style, children }) => (
  <View style={[styles.container, style]}>
    <Text style={styles.text}>🗺️ Map not available on web</Text>
    <Text style={styles.subtext}>Use Expo Go on Android or iOS</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 13,
    color: '#475569',
  },
});

// ── No-op component stubs ─────────────────────────────────────────────────────
const NoopComponent = () => null;

// ── Exports matching react-native-maps public API ─────────────────────────────
export default MapViewStub;
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
  constructor(region) { Object.assign(this, region); }
  timing() { return { start: () => {} }; }
};
