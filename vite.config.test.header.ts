import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const APP_BUILD = {
  commit: "test-stack",
  commitDate: new Date().toISOString(),
  builtAt: new Date().toISOString(),
};

// Header test stack: vite on 127.0.0.1:5302 talking to the in-memory backend on :5202
// (startHeaderTestStack.js). Never the live :5001 / :5183.
export default defineConfig({
  base: "/",
  configFile: false,
  // Own dep-optimizer cache so parallel test stacks never clash.
  cacheDir: "node_modules/.vite-header",
  // Never read .env / .env.production: point the env dir at a folder with no env files.
  envDir: path.resolve(__dirname, "./src/test"),
  define: {
    __APP_BUILD__: JSON.stringify(APP_BUILD),
    "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:5202/api"),
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify("http://127.0.0.1:5202/api/hrms"),
    "import.meta.env.VITE_SOCKET_URL": JSON.stringify("http://127.0.0.1:5202"),
    "import.meta.env.VITE_SITE_URL": JSON.stringify("http://127.0.0.1:5302"),
  },
  server: {
    host: "127.0.0.1",
    port: 5302,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5202",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:5202",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:5202",
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
