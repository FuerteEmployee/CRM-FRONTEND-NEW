import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const APP_BUILD = {
  commit: "test-stack",
  commitDate: new Date().toISOString(),
  builtAt: new Date().toISOString(),
};

// Test vite configuration on port 5173 proxying to test backend 5101
export default defineConfig({
  base: "/",
  configFile: false,
  define: {
    __APP_BUILD__: JSON.stringify(APP_BUILD),
    "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:5101/api"),
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify("http://127.0.0.1:5101/api"),
    "import.meta.env.VITE_SOCKET_URL": JSON.stringify("http://127.0.0.1:5101"),
    "import.meta.env.VITE_SITE_URL": JSON.stringify("http://127.0.0.1:5173"),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5101",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:5101",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:5101",
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
