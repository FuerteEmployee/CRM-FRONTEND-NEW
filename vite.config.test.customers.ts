import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const APP_BUILD = {
  commit: "test-stack",
  commitDate: new Date().toISOString(),
  builtAt: new Date().toISOString(),
};

// Customers test stack: vite on 127.0.0.1:5304 talking to the in-memory backend on :5204
// (startCustomersFullpassStack.js). Never the live :5001 / :5183.
export default defineConfig({
  base: "/",
  configFile: false,
  // Never read .env / .env.production: point the env dir at a folder with no env files.
  envDir: path.resolve(__dirname, "./src/test"),
  define: {
    __APP_BUILD__: JSON.stringify(APP_BUILD),
    "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:5204/api"),
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify("http://127.0.0.1:5204/api/hrms"),
    "import.meta.env.VITE_SOCKET_URL": JSON.stringify("http://127.0.0.1:5204"),
    "import.meta.env.VITE_SITE_URL": JSON.stringify("http://127.0.0.1:5304"),
  },
  server: {
    host: "127.0.0.1",
    port: 5304,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5204",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:5204",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:5204",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
