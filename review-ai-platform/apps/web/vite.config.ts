import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    extensions: [".ts", ".tsx", ".vue", ".mjs", ".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 6666,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:6667",
        changeOrigin: true
      }
    }
  }
});
