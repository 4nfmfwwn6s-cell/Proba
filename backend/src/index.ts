import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import "./db.js";
import { chatRouter } from "./routes/chat.js";
import { ttsRouter } from "./routes/tts.js";
import { sttRouter } from "./routes/stt.js";
import { settingsRouter } from "./routes/settings.js";
import { sessionsRouter } from "./routes/sessions.js";
import { profilesRouter } from "./routes/profiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const HOST = "0.0.0.0";

function getLanAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.push(entry.address);
      }
    }
  }
  return addresses;
}

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

// Serve the built frontend (frontend/dist) if present, so the whole app
// can run from a single `npm start` in production.
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.listen(PORT, HOST, () => {
  const lanAddresses = getLanAddresses();
  console.log(`English coach backend listening on:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  if (lanAddresses.length === 0) {
    console.log(`  Network: no LAN network interface detected`);
  } else {
    for (const address of lanAddresses) {
      console.log(`  Network: http://${address}:${PORT}  <- open this on other devices on your Wi-Fi`);
    }
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
