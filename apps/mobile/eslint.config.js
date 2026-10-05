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
          ignore: [
            "^@/features/map/presentation/center-map$",
            "^@/features/offline/application/offline-download$",
            "^@/features/offline/data/offline-storage$",
            "^@/features/routing/presentation/route-map$",
          ],
        },
      ],
    },
  },
  {
    files: ["src/**"],
    rules: {
      "max-lines": [
        "warn",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
    },
  },
]);
