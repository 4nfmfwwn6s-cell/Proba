import { Router } from "express";
import { db } from "../db.js";
import type { Correction, ConversationMode, Difficulty, ErrorType } from "../types.js";

export const sessionsRouter = Router();

interface SessionRow {
  id: number;
  profile_id: number;
  mode: ConversationMode;
  difficulty: Difficulty;
  started_at: string;
  ended_at: string | null;
}

interface TurnRow {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  correction_json: string | null;
  created_at: string;
}

sessionsRouter.post("/", (req, res) => {
  const { profileId, mode, difficulty } = req.body as {
    profileId?: number;
    mode?: ConversationMode;
    difficulty?: Difficulty;
  };
  if (!profileId || !mode || !difficulty) {
    return res.status(400).json({ error: "profileId, mode and difficulty are required" });
  }

  const profile = db.prepare("SELECT id FROM profiles WHERE id = ?").get(profileId);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const now = new Date().toISOString();
  const info = db
    .prepare("INSERT INTO sessions (profile_id, mode, difficulty, started_at, ended_at) VALUES (?, ?, ?, ?, NULL)")
    .run(profileId, mode, difficulty, now);
  res.json({ sessionId: info.lastInsertRowid, profileId, mode, difficulty, startedAt: now });
});

sessionsRouter.get("/", (req, res) => {
  const profileId = Number(req.query.profileId);
  if (!profileId) {
    return res.status(400).json({ error: "profileId query parameter is required" });
  }

  const rows = db
    .prepare("SELECT id, mode, difficulty, started_at, ended_at FROM sessions WHERE profile_id = ? ORDER BY id DESC LIMIT 50")
    .all(profileId) as SessionRow[];
  res.json(
    rows.map((r) => ({
      id: r.id,
      mode: r.mode,
      difficulty: r.difficulty,
      startedAt: r.started_at,
      endedAt: r.ended_at,
    }))
  );
});

function buildSummary(turns: TurnRow[]) {
  const mistakesByType: Record<string, Correction[]> = {};
  const corrections: Correction[] = [];

  for (const turn of turns) {
    if (turn.correction_json) {
      const correction = JSON.parse(turn.correction_json) as Correction;
      corrections.push(correction);
      const type: ErrorType = correction.errorType ?? "other";
      if (!mistakesByType[type]) mistakesByType[type] = [];
      mistakesByType[type].push(correction);
    }
  }

  const vocabReview = corrections
    .filter((c) => c.errorType === "vocabulary")
    .slice(0, 5)
    .map((c) => c.corrected);

  // Pad with other corrected forms if fewer than 5 vocab items were found.
  if (vocabReview.length < 5) {
    for (const c of corrections) {
      if (vocabReview.length >= 5) break;
      if (!vocabReview.includes(c.corrected)) vocabReview.push(c.corrected);
    }
  }

  return {
    totalMistakes: corrections.length,
    mistakesByType,
    vocabReview: vocabReview.slice(0, 5),
  };
}

sessionsRouter.get("/:id", (req, res) => {
  const sessionId = Number(req.params.id);
  const profileId = req.query.profileId ? Number(req.query.profileId) : undefined;

  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as SessionRow | undefined;
  if (!session || (profileId !== undefined && session.profile_id !== profileId)) {
    return res.status(404).json({ error: "Session not found" });
  }

  const turns = db
    .prepare("SELECT * FROM turns WHERE session_id = ? ORDER BY id ASC")
    .all(sessionId) as TurnRow[];

  res.json({
    id: session.id,
    mode: session.mode,
    difficulty: session.difficulty,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    turns: turns.map((t) => ({
      id: t.id,
      role: t.role,
      content: t.content,
      correction: t.correction_json ? JSON.parse(t.correction_json) : null,
      createdAt: t.created_at,
    })),
    summary: buildSummary(turns),
  });
});

sessionsRouter.post("/:id/end", (req, res) => {
  const sessionId = Number(req.params.id);
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as SessionRow | undefined;
  if (!session) return res.status(404).json({ error: "Session not found" });

  const now = new Date().toISOString();
  db.prepare("UPDATE sessions SET ended_at = ? WHERE id = ?").run(now, sessionId);

  const turns = db
    .prepare("SELECT * FROM turns WHERE session_id = ? ORDER BY id ASC")
    .all(sessionId) as TurnRow[];

  res.json({ endedAt: now, summary: buildSummary(turns) });
});
