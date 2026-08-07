import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 5174,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.ico"],
      devOptions: {
        // Serve the manifest + a real service worker under `npm run dev` too,
        // not just in a production build — otherwise the browser never sees
        // an installable app while developing against localhost:5173.
        enabled: true,
        type: "module",
      },
      manifest: {
        name: "CRMPro",
        short_name: "CRMPro",
        description: "CRMPro - Complete CRM and team management platform",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1e293b",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // API/socket traffic must always hit the network live — only cache
        // the app shell's own static build output.
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // The vendor-react chunk bundles react/router/radix-ui/recharts/etc.
        // together (see manualChunks comment in this file) and exceeds
        // workbox's 2 MiB default precache limit.
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("xlsx") || id.includes("canvg")) {
              return "vendor-export";
            }
            if (id.includes("@capacitor") || id.includes("@capgo")) {
              return "vendor-capacitor";
            }
            if (id.includes("firebase")) {
              return "vendor-firebase";
            }
            if (id.includes("socket.io")) {
              return "vendor-socket";
            }
            if (id.includes("date-fns") || id.includes("zod") || id.includes("papaparse")) {
              return "vendor-utils";
            }
            // Everything else (react, react-dom, react-router-dom, @radix-ui, recharts/d3,
            // leaflet/maplibre + their React wrappers, @dnd-kit, cmdk, vaul, input-otp,
            // next-themes, sonner, react-hook-form, etc.) stays in one chunk together.
            // Splitting these apart from react caused chunk-load-order races where a
            // library calling React.createContext() at module scope ran before the
            // react chunk had finished initializing, throwing "Cannot read properties
            // of undefined (reading 'createContext')".
            return "vendor-react";
          }
          if (id.includes("src/hrms")) {
            return "module-hrms";
          }
          if (id.includes("src/pages/setup")) {
            return "module-setup";
          }
          if (id.includes("src/pages/super-admin")) {
            return "module-superadmin";
          }
          if (id.includes("src/pages/client")) {
            return "module-client";
          }
          if (id.includes("src/pages/reports") || id.includes("src/pages/ReportPages")) {
            return "module-reports";
          }
          if (id.includes("src/pages/quotations")) {
            return "module-quotations";
          }
        },
      },
    },
  },
}));

