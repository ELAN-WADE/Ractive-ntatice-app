module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            // Maps @/* imports to src/* at runtime (Metro/Babel level).
            // TypeScript uses tsconfig paths for type resolution.
            '@': './src',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
      // NOTE: 'expo-router/babel' was removed — it is deprecated in Expo SDK 51.
      // babel-preset-expo now includes Expo Router support automatically.
    ],
  };
};
