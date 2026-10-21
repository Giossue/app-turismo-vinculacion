// Source maps are uploaded to Sentry only when the build has a token; the
// plugin's upload step would fail a build without one. Organization and
// project come from SENTRY_ORG and SENTRY_PROJECT.
function withSentrySourceMaps(config) {
  if (!process.env.SENTRY_AUTH_TOKEN) return config;
  return {
    ...config,
    plugins: [...(config.plugins ?? []), "@sentry/react-native/expo"],
  };
}

// Keep the local Android development build alongside the installed release app.
module.exports = ({ config }) => {
  const appConfig = withSentrySourceMaps(config);
  if (process.env.APP_VARIANT !== "development") {
    return appConfig;
  }

  return {
    ...appConfig,
    name: `${appConfig.name} Dev`,
    android: {
      ...appConfig.android,
      package: `${appConfig.android.package}.dev`,
    },
  };
};
