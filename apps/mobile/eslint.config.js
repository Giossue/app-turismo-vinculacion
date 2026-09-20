// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      // TypeScript y Metro resuelven los componentes .native/.web; el resolver de
      // eslint-config-expo no reconoce este par de extensiones.
      "import/no-unresolved": [
        "error",
        {
          // TypeScript/Metro select the platform file (.native/.web), while
          // eslint-plugin-import has no platform-aware resolver by default.
          ignore: [
            "^@/features/map/presentation/center-map$",
            "^@/features/offline/application/offline-download$",
            "^@/features/offline/data/offline-storage$",
          ],
        },
      ],
    },
  },
]);
