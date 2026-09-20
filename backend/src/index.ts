import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { fileURLToPath } from "node:url";
import "./db.js";
import { getLanAddresses } from "./lib/network.js";
import { chatRouter } from "./routes/chat.js";
import { ttsRouter } from "./routes/tts.js";
import { sttRouter } from "./routes/stt.js";
import { settingsRouter } from "./routes/settings.js";
import { sessionsRouter } from "./routes/sessions.js";
import { profilesRouter } from "./routes/profiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const HOST = "0.0.0.0";

// If a certificate has been generated (`npm run generate-cert`), serve over
// HTTPS - required for microphone access from other devices on the LAN
// (iOS Safari, and modern browsers generally, refuse getUserMedia outside a
// secure context). Falls back to plain HTTP otherwise.
const certsDir = path.join(__dirname, "..", "..", "certs");
const certPath = path.join(certsDir, "cert.pem");
const keyPath = path.join(certsDir, "key.pem");
const hasCert = fs.existsSync(certPath) && fs.existsSync(keyPath);

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api/chat", chatRouter);
app.use("/api/tts", ttsRouter);
app.use("/api/stt", sttRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/profiles", profilesRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Lets you get the self-signed cert onto another device (e.g. an iPhone)
// just by opening this URL in its browser - Safari/iOS recognizes this
// content type and offers to install it as a trusted profile, no cable,
// email, or AirDrop needed. Registered before the SPA catch-all below.
if (hasCert) {
  app.get("/cert.pem", (_req, res) => {
    res.setHeader("Content-Type", "application/x-x509-ca-cert");
    res.setHeader("Content-Disposition", "attachment; filename=english-coach-dev-cert.pem");
    res.sendFile(certPath);
  });
}

// Serve the built frontend (frontend/dist) if present, so the whole app
// can run from a single `npm start` in production.
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

const server = hasCert
  ? https.createServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, app)
  : http.createServer(app);
const scheme = hasCert ? "https" : "http";

server.listen(PORT, HOST, () => {
  const lanAddresses = getLanAddresses();
  console.log(`English coach backend listening on:`);
  console.log(`  Local:   ${scheme}://localhost:${PORT}`);
  if (lanAddresses.length === 0) {
    console.log(`  Network: no LAN network interface detected`);
  } else {
    for (const address of lanAddresses) {
      console.log(`  Network: ${scheme}://${address}:${PORT}  <- open this on other devices on your Wi-Fi`);
    }
  }
  console.log("");

  if (hasCert) {
    console.log(
      `To trust this certificate on your iPhone: open <Network URL above>/cert.pem in Safari on the phone` +
        ` and follow the profile-install prompts. See the README's 'HTTPS for LAN / iOS mic access' section` +
        ` for the full steps (including Windows).`
    );
  } else {
    console.log(
      `Running over plain HTTP - fine for the desktop, but iOS (and most browsers) block microphone access` +
        ` over HTTP on any address other than localhost. To use the app from your phone, run` +
        ` \`npm run generate-cert\` in backend/, then restart. See the README's 'HTTPS for LAN / iOS mic` +
        ` access' section for details.`
    );
  }
  console.log("");

  console.log(
    `If other devices can't connect, Windows Firewall may be blocking port ${PORT}. On first run, Windows` +
      ` usually shows an "Allow access" prompt for Node.js - click Allow for Private networks. If you don't` +
      ` see that prompt (or blocked it), open PowerShell as Administrator and run:`
  );
  console.log(
    `  New-NetFirewallRule -DisplayName "English Coach Backend" -Direction Inbound -Protocol TCP -LocalPort ${PORT} -Action Allow -Profile Private`
  );
});
