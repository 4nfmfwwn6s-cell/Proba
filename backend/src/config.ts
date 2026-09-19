import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppConfig } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");

const DEFAULT_CONFIG: AppConfig = {
  anthropicApiKey: "",
  elevenLabsApiKey: "",
  openaiApiKey: "",
  ttsProvider: "browser",
  ttsVoice: "",
  speechSpeed: 1.0,
  explanationLanguage: "hu",
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadConfig(): AppConfig {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(partial: Partial<AppConfig>): AppConfig {
  ensureDataDir();
  const current = loadConfig();
  const next = { ...current, ...partial };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
  return next;
}

// Config with secrets redacted, safe to send to the browser.
export function publicConfig(config: AppConfig): Record<string, unknown> {
  return {
    hasAnthropicKey: Boolean(config.anthropicApiKey),
    hasElevenLabsKey: Boolean(config.elevenLabsApiKey),
    hasOpenaiKey: Boolean(config.openaiApiKey),
    ttsProvider: config.ttsProvider,
    ttsVoice: config.ttsVoice,
    speechSpeed: config.speechSpeed,
    explanationLanguage: config.explanationLanguage,
  };
}
