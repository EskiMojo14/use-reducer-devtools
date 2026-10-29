import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "no-underscore-dangle": ["warn", { allow: ["__REDUX_DEVTOOLS_EXTENSION__"] }],
    },
    options: { typeAware: true, typeCheck: true },
    categories: {
      correctness: "error",
      suspicious: "warn",
    },
    overrides: [
      {
        files: ["examples/**"],
        plugins: ["react"],
        rules: {
          "react/only-export-components": ["warn", { allowConstantExport: true }],
        },
      },
    ],
  },
  fmt: {
    sortImports: true,
    ignorePatterns: [],
  },
  pack: {
    deps: {
      // tsdown <0.23 compatibility: resolve external dependency subpaths.
      // Remove to preserve subpath imports as written (the new default).
      // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
      resolveDepSubpath: true,
    },
    entry: ["src/index.ts"],
    sourcemap: true,
    format: ["esm", "cjs"],
    dts: true,
    minify: true,
  },
});
