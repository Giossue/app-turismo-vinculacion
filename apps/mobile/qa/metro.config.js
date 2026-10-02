const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// These shared sources live outside the QA project. Watch them so subsequent
// checks receive the current product code after edits, including Fast Refresh.
config.watchFolders = [
  ...config.watchFolders,
  path.resolve(__dirname, "../src"),
  path.resolve(__dirname, "../assets"),
];

// Keep the actual chat UI while isolating recording, Auth and transcription.
// This alias only exists in the QA bundler; the product uses its normal hook.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isVoiceHook =
    context.originModulePath.endsWith("/agent-chat-content.tsx") &&
    moduleName === "./agent-voice-input";
  return context.resolveRequest(
    context,
    isVoiceHook ? path.join(__dirname, "voice-fixture.ts") : moduleName,
    platform,
  );
};

module.exports = config;
