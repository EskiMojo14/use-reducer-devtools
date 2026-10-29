import { resolve } from "path";

import react from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "use-reducer-devtools": resolve("../../src"),
    },
  },
  plugins: lazyPlugins(() => [react()]),
});
