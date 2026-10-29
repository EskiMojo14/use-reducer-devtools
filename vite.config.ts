import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

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
          "react/react-in-jsx-scope": "off",
        },
      },
    ],
  },
  fmt: {
    sortImports: true,
    sortPackageJson: true,
    ignorePatterns: [],
  },
  staged: {
    "*.{ts,md}": "vp fmt",
  },
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: ["**/*.node.test.ts"],
        },
      },
      {
        test: {
          name: "browser",
          retry: 3,
          unstubGlobals: true,
          include: ["**/*.browser.test.ts", "**/*.browser.test.tsx"],
          setupFiles: ["./test/browser/setup.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: { channel: "chromium" },
              contextOptions: { permissions: ["clipboard-read", "clipboard-write"] },
            }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        test: {
          name: "types",
          typecheck: {
            enabled: true,
            only: true,
            include: ["**/*.test-d.ts"],
          },
        },
      },
    ],
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
    exports: true,
  },
});
