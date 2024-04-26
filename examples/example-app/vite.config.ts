import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "use-reducer-devtools": resolve("../../src"),
    },
  },
  plugins: [react()],
});
