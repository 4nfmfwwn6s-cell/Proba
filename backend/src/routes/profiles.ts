import { Router } from "express";
import { db } from "../db.js";
import { loadConfig, publicConfig } from "../config.js";
import type { CorrectionSpeechLevel, Starter, TtsProvider } from "../types.js";

export const profilesRouter = Router();

interface ProfileRow {
  id: number;
  name: string;
  tts_provider: TtsProvider;
  tts_voice: string;
  hu_tts_voice: string;
  speech_speed: number;
  explanation_language: "hu" | "en";
  correction_speech_level: CorrectionSpeechLevel;
  default_starter: Starter;
  created_at: string;
}

profilesRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT id, name FROM profiles ORDER BY name COLLATE NOCASE ASC").all() as {
    id: number;
    name: string;
  }[];
  res.json(rows);
});

profilesRouter.post("/", (req, res) => {
  const name = String((req.body as { name?: string }).name ?? "").trim();
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }
  if (name.length > 40) {
    return res.status(400).json({ error: "name is too long (max 40 characters)" });
  }

  const existing = db.prepare("SELECT id, name FROM profiles WHERE name = ? COLLATE NOCASE").get(name) as
    | { id: number; name: string }
    | undefined;
  if (existing) {
    return res.status(409).json({ error: "PROFILE_EXISTS", profile: existing });
  }

  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO profiles
        (name, tts_provider, tts_voice, hu_tts_voice, speech_speed, explanation_language, correction_speech_level, default_starter, created_at)
       VALUES (?, 'browser', '', '', 1.0, 'hu', 'corrected_and_explanation', 'user', ?)`
    )
    .run(name, now);

  res.json({ id: info.lastInsertRowid, name });
});

function getProfileRow(id: number): ProfileRow | undefined {
  return db.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as ProfileRow | undefined;
}

function profileSettingsPayload(profile: ProfileRow) {
  return {
    ...publicConfig(loadConfig()),
    ttsProvider: profile.tts_provider,
    ttsVoice: profile.tts_voice,
    huTtsVoice: profile.hu_tts_voice,
    speechSpeed: profile.speech_speed,
    explanationLanguage: profile.explanation_language,
    correctionSpeechLevel: profile.correction_speech_level,
    defaultStarter: profile.default_starter,
  };
}

profilesRouter.get("/:id/settings", (req, res) => {
  const profile = getProfileRow(Number(req.params.id));
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profileSettingsPayload(profile));
});

const ALLOWED_PREFS = [
  "ttsProvider",
  "ttsVoice",
  "huTtsVoice",
  "speechSpeed",
  "explanationLanguage",
  "correctionSpeechLevel",
  "defaultStarter",
] as const;
const COLUMN_BY_PREF: Record<(typeof ALLOWED_PREFS)[number], string> = {
  ttsProvider: "tts_provider",
  ttsVoice: "tts_voice",
  huTtsVoice: "hu_tts_voice",
  speechSpeed: "speech_speed",
  explanationLanguage: "explanation_language",
  correctionSpeechLevel: "correction_speech_level",
  defaultStarter: "default_starter",
};

profilesRouter.post("/:id/settings", (req, res) => {
  const profileId = Number(req.params.id);
  const profile = getProfileRow(profileId);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const body = req.body as Record<string, unknown>;
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const key of ALLOWED_PREFS) {
    if (body[key] !== undefined) {
      sets.push(`${COLUMN_BY_PREF[key]} = ?`);
      values.push(body[key]);
    }
  }

  if (sets.length > 0) {
    values.push(profileId);
    db.prepare(`UPDATE profiles SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  }

  const updated = getProfileRow(profileId)!;
  res.json(profileSettingsPayload(updated));
});
