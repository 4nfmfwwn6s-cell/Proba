import { Router } from "express";
import { loadConfig } from "../config.js";

export const ttsRouter = Router();

const DEFAULT_ELEVENLABS_VOICE = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" - a clear, neutral English voice
const DEFAULT_OPENAI_VOICE = "alloy";

ttsRouter.post("/", async (req, res) => {
  const { text, speed } = req.body as { text?: string; speed?: number };
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const config = loadConfig();

  try {
    if (config.ttsProvider === "elevenlabs") {
      if (!config.elevenLabsApiKey) {
        return res.status(400).json({ error: "MISSING_ELEVENLABS_KEY" });
      }
      const voiceId = config.ttsVoice || DEFAULT_ELEVENLABS_VOICE;
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": config.elevenLabsApiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => "");
        console.error("ElevenLabs TTS error:", response.status, errText);
        return res.status(502).json({ error: "TTS provider request failed" });
      }

      res.setHeader("Content-Type", "audio/mpeg");
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.send(buffer);
    }

    if (config.ttsProvider === "openai") {
      if (!config.openaiApiKey) {
        return res.status(400).json({ error: "MISSING_OPENAI_KEY" });
      }
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          voice: config.ttsVoice || DEFAULT_OPENAI_VOICE,
          input: text,
          speed: speed ?? config.speechSpeed ?? 1.0,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error("OpenAI TTS error:", response.status, errText);
        return res.status(502).json({ error: "TTS provider request failed" });
      }

      res.setHeader("Content-Type", "audio/mpeg");
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.send(buffer);
    }

    return res.status(400).json({ error: "Server TTS is not configured; use the browser voice instead." });
  } catch (err) {
    console.error("TTS proxy error:", err);
    res.status(502).json({ error: "TTS request failed" });
  }
});
