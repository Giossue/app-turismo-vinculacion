const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// Adds debug IDs to bundles and source maps so error reports can be matched
// to the uploaded source maps. Web replay is never bundled.
module.exports = getSentryExpoConfig(__dirname, { includeWebReplay: false });
