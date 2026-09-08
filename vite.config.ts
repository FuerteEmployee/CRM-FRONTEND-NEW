import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 5183,
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

