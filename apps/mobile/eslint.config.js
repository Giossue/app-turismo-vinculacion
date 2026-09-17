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
        { ignore: ["^@/features/map/presentation/center-map$"] },
      ],
    },
  },
]);
