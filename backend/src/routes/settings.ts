import { Router } from "express";
import { loadConfig, saveConfig, publicConfig } from "../config.js";
import type { AppConfig } from "../types.js";

export const settingsRouter = Router();

settingsRouter.get("/", (_req, res) => {
  res.json(publicConfig(loadConfig()));
});

const ALLOWED_KEYS: (keyof AppConfig)[] = [
  "anthropicApiKey",
  "elevenLabsApiKey",
  "openaiApiKey",
  "ttsProvider",
  "ttsVoice",
  "speechSpeed",
  "explanationLanguage",
];

settingsRouter.post("/", (req, res) => {
  const body = req.body as Partial<AppConfig>;
  const partial: Partial<AppConfig> = {};

  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      (partial as Record<string, unknown>)[key] = body[key];
    }
  }

  const updated = saveConfig(partial);
  res.json(publicConfig(updated));
});
