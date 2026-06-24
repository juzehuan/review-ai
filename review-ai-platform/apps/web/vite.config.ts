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
    port: 8001,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8002",
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("echarts") || id.includes("zrender")) {
            return "charts";
          }
          if (id.includes("@ant-design/icons-vue")) {
            return "ui-icons";
          }
          if (id.includes("ant-design-vue")) {
            return "ui";
          }
          if (id.includes("vue") || id.includes("vue-router") || id.includes("pinia")) {
            return "vue-vendor";
          }
          return "vendor";
        }
      }
    }
  }
});
