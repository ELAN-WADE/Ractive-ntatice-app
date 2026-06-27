const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ── Asset extensions ──────────────────────────────────────────────────────────
config.resolver.assetExts.push('lottie');

// ── Resolve problematic Node.js / native-only modules ────────────────────────
// resolveRequest fires for ALL module resolutions, including those originating
// inside node_modules. This is needed because extraNodeModules only applies
// to imports from app code, not from within node_modules themselves.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // 1. Stub @opentelemetry/api — supabase-js imports this for server tracing;
  //    it has no React Native equivalent.
  if (moduleName === '@opentelemetry/api') {
    return {
      filePath: path.resolve(__dirname, 'src/stubs/opentelemetry-api.js'),
      type: 'sourceFile',
    };
  }

  // 2. Stub react-native-maps on web — it's a native-only module and crashes
  //    the web bundler trying to resolve internal React Native platform files.
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'src/stubs/react-native-maps.web.js'),
      type: 'sourceFile',
    };
  }

  // Default Metro resolution for everything else
  return context.resolveRequest(context, moduleName, platform);
};


module.exports = config;

