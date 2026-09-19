import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "sessions.sqlite3");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    tts_provider TEXT NOT NULL DEFAULT 'browser',
    tts_voice TEXT NOT NULL DEFAULT '',
    hu_tts_voice TEXT NOT NULL DEFAULT '',
    speech_speed REAL NOT NULL DEFAULT 1.0,
    explanation_language TEXT NOT NULL DEFAULT 'hu',
    correction_speech_level TEXT NOT NULL DEFAULT 'corrected_and_explanation',
    default_starter TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES profiles(id),
    mode TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT
  );

  CREATE TABLE IF NOT EXISTS turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    correction_json TEXT,
    turn_type TEXT,
    translation_json TEXT,
    created_at TEXT NOT NULL
  );
`);

// Lightweight migrations for databases created before a given column existed.
function ensureColumn(table: string, column: string, ddl: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

ensureColumn("sessions", "profile_id", "profile_id INTEGER REFERENCES profiles(id)");
ensureColumn("profiles", "hu_tts_voice", "hu_tts_voice TEXT NOT NULL DEFAULT ''");
ensureColumn(
  "profiles",
  "correction_speech_level",
  "correction_speech_level TEXT NOT NULL DEFAULT 'corrected_and_explanation'"
);
ensureColumn("profiles", "default_starter", "default_starter TEXT NOT NULL DEFAULT 'user'");
ensureColumn("turns", "turn_type", "turn_type TEXT");
ensureColumn("turns", "translation_json", "translation_json TEXT");
