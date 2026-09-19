import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import "./db.js";
import { chatRouter } from "./routes/chat.js";
import { ttsRouter } from "./routes/tts.js";
import { sttRouter } from "./routes/stt.js";
import { settingsRouter } from "./routes/settings.js";
import { sessionsRouter } from "./routes/sessions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api/chat", chatRouter);
app.use("/api/tts", ttsRouter);
app.use("/api/stt", sttRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/sessions", sessionsRouter);

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

app.listen(PORT, () => {
  console.log(`English coach backend listening on http://localhost:${PORT}`);
});
