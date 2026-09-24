// Keep the local Android development build alongside the installed release app.
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== "development") {
    return config;
  }

  return {
    ...config,
    name: `${config.name} Dev`,
    android: {
      ...config.android,
      package: `${config.android.package}.dev`,
    },
  };
};
