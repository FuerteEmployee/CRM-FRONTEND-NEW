// TEMPORARY test config (po-ui stack) — removed when the stack stops.
import base from "./vite.config";
import { defineConfig } from "vite";
export default defineConfig((env: any) => {
  const b: any = (base as any)(env);
  b.server = { host: "localhost", port: 5173, strictPort: true, hmr: { overlay: false },
    proxy: {
      "/api": { target: "http://127.0.0.1:5101", changeOrigin: true },
      "/uploads": { target: "http://127.0.0.1:5101", changeOrigin: true },
      "/socket.io": { target: "http://127.0.0.1:5101", changeOrigin: true, ws: true },
    } };
  return b;
});
