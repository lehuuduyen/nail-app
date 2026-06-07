const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '..')];

// Stripe SDKs are native-only — return empty module when bundling for web
const NATIVE_ONLY = ['@stripe/stripe-react-native', '@stripe/stripe-terminal-react-native'];
const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (ctx, moduleName, platform) => {
  if (platform === 'web' && NATIVE_ONLY.some((pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'))) {
    return { type: 'empty' };
  }
  return originalResolve
    ? originalResolve(ctx, moduleName, platform)
    : ctx.resolveRequest(ctx, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
