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
      // null: registration is done ourselves via `virtual:pwa-register` in
      // src/pwa.ts, so we control onNeedRefresh (forces a reload — see
      // that file for why). "auto" would additionally self-register with
      // no reload hook, silently swapping caches under a running tab.
      injectRegister: null,
      includeAssets: ["favicon.ico"],
      devOptions: {
        // Disabled: the dev SW's precache-install fetch for index.html races
        // with Vite's HMR reloads, throwing "Cache.put() encountered a
        // network error" on almost every refresh. Test installability/offline
        // behavior against a real build instead: `npm run build && npm run preview`.
        enabled: false,
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
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        // Purge old precache entries and take control immediately on update,
        // so a stale/interrupted cache.put() from a prior SW version can't
        // linger and get served alongside a newer app shell.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
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
            // react + react-dom core — must be a single chunk so every library
            // that calls React.createContext() at module scope all share the same
            // React instance. All other chunks below import FROM this one via
            // Rollup's normal module graph, so there is no initialization-order
            // race (Rollup resolves imports before executing module bodies).
            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/") ||
              id.includes("/node_modules/scheduler/")
            ) {
              return "vendor-react-core";
            }
            if (id.includes("react-router") || id.includes("@remix-run")) {
              return "vendor-router";
            }
            if (id.includes("@radix-ui")) {
              return "vendor-radix";
            }
            // recharts pulls in a large slice of d3 — keep them together
            if (id.includes("recharts") || id.includes("/d3") || id.includes("d3-")) {
              return "vendor-charts";
            }
            // mapping libraries are large and rarely change
            if (
              id.includes("leaflet") ||
              id.includes("maplibre") ||
              id.includes("react-leaflet") ||
              id.includes("react-map-gl")
            ) {
              return "vendor-maps";
            }
            if (id.includes("@dnd-kit")) {
              return "vendor-dnd";
            }
            if (id.includes("react-hook-form") || id.includes("@hookform")) {
              return "vendor-forms";
            }
            // face-api.js bundles TensorFlow.js + model weights — by far the
            // largest single dependency (~6 MB). Must be isolated first.
            if (id.includes("face-api") || id.includes("@tensorflow")) {
              return "vendor-faceapi";
            }
            // Large media / picker UI
            if (id.includes("emoji-picker-react")) {
              return "vendor-emoji";
            }
            // Animation runtime
            if (id.includes("framer-motion")) {
              return "vendor-motion";
            }
            // Data-fetching
            if (id.includes("@tanstack")) {
              return "vendor-query";
            }
            // Video conferencing SDK
            if (id.includes("@jitsi") || id.includes("lib-jitsi-meet")) {
              return "vendor-jitsi";
            }
            // country-state-city is loaded via dynamic import() in
            // LocationSelector.tsx — only when the user opens the city picker
            // inside HRMS. Return undefined (not "vendor-misc") so Rollup
            // emits it as a standalone async chunk that is NEVER part of the
            // synchronous initial payload.
            if (id.includes("country-state-city")) {
              return undefined;
            }
            // Rich text editor
            if (id.includes("react-quill") || id.includes("quill")) {
              return "vendor-editor";
            }
            // Offline / IndexedDB
            if (id.includes("dexie")) {
              return "vendor-db";
            }
            // Everything else (cmdk, vaul, next-themes, sonner, input-otp,
            // embla-carousel, react-day-picker, react-resizable-panels,
            // react-speech-recognition, driver.js, regenerator-runtime,
            // class-variance-authority, clsx, tailwind-merge, etc.)
            return "vendor-misc";
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

