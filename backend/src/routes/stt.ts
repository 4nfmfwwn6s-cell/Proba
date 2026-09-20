import { Router } from "express";
import multer from "multer";
import { loadConfig } from "../config.js";

export const sttRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

sttRouter.post("/", upload.single("audio"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "audio file is required (field name 'audio')" });
  }

  const config = loadConfig();
  if (!config.openaiApiKey) {
    return res.status(400).json({ error: "MISSING_OPENAI_KEY" });
  }

  const requestedLanguage = (req.body as { language?: string } | undefined)?.language;
  const language = requestedLanguage === "hu" ? "hu" : "en";

  try {
    const formData = new FormData();
    formData.append("model", "whisper-1");
    formData.append("language", language);
    formData.append(
      "file",
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || "audio/webm" }),
      file.originalname || "audio.webm"
    );

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.openaiApiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("Whisper STT error:", response.status, errText);
      return res.status(502).json({ error: "Speech-to-text request failed" });
    }

    const data = (await response.json()) as { text: string };
    res.json({ text: data.text });
  } catch (err) {
    console.error("STT proxy error:", err);
    res.status(502).json({ error: "Speech-to-text request failed" });
  }
});
