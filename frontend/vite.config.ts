import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Shared with the backend - see backend/scripts/generate-cert.ts. When
// present, both the Vite dev server and the backend serve over HTTPS, which
// iOS (and browsers generally) require for microphone access from any
// address other than localhost.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certsDir = path.join(__dirname, "..", "certs");
const certPath = path.join(certsDir, "cert.pem");
const keyPath = path.join(certsDir, "key.pem");
const hasCert = fs.existsSync(certPath) && fs.existsSync(keyPath);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    https: hasCert ? { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) } : undefined,
    proxy: {
      "/api": {
        // The proxy runs server-side in Vite's Node process, not in the
        // browser, so talking to the backend over plain HTTP on localhost
        // here doesn't affect the page's own secure-context status.
        target: hasCert ? "https://localhost:3001" : "http://localhost:3001",
        changeOrigin: true,
        // Skip certificate verification for the self-signed backend cert.
        secure: !hasCert,
      },
    },
  },
});
