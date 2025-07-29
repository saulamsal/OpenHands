const { getDefaultConfig } = require('expo/metro-config');
const { webShimLibraries } = require('./lib/shims');

const config = getDefaultConfig(__dirname);

// Add web shims for native-only libraries
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Create resolver alias for web shims
const webShims = {};
webShimLibraries.forEach(lib => {
  webShims[lib] = require.resolve('./lib/empty-shim.js');
});

config.resolver.alias = {
  ...config.resolver.alias,
  ...webShims,
};

// Only apply web shims when building for web
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;