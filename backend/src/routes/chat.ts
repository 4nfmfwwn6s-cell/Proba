import { Router } from "express";
import { db } from "../db.js";
import { loadConfig } from "../config.js";
import { getChatCompletion, getOpeningReply } from "../lib/anthropic.js";
import type { ChatMessage, ChatTurnResult, ConversationMode, Difficulty } from "../types.js";

export const chatRouter = Router();

interface SessionRow {
  id: number;
  mode: ConversationMode;
  difficulty: Difficulty;
}

// Composes a display-friendly assistant turn (used for the session-history
// view), since translation_request/meta_question turns carry extra spoken
// parts beyond "reply" that a plain-text turns.content column doesn't model.
function buildAssistantDisplayContent(result: ChatTurnResult): string {
  if (result.turnType === "translation_request" && result.translation) {
    const note = result.translation.hungarianNote ? `\n(${result.translation.hungarianNote})` : "";
    return `${result.translation.englishSentence}${note}\n${result.reply}`;
  }
  if (result.turnType === "meta_question" && result.metaReplyHu) {
    return `${result.metaReplyHu}\n${result.reply}`;
  }
  return result.reply;
}

chatRouter.post("/", async (req, res) => {
  const { sessionId, history } = req.body as { sessionId?: number; history?: ChatMessage[] };

  if (!sessionId || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: "sessionId and non-empty history are required" });
  }

  const session = db
    .prepare("SELECT id, mode, difficulty FROM sessions WHERE id = ?")
    .get(sessionId) as SessionRow | undefined;

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const config = loadConfig();
  if (!config.anthropicApiKey) {
    return res.status(400).json({ error: "MISSING_API_KEY" });
  }

  const lastMessage = history[history.length - 1];
  if (lastMessage.role !== "user") {
    return res.status(400).json({ error: "Last history entry must be from the user" });
  }

  try {
    const result = await getChatCompletion(config.anthropicApiKey, history, session.mode, session.difficulty);
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO turns (session_id, role, content, correction_json, turn_type, translation_json, created_at)
       VALUES (?, 'user', ?, ?, ?, ?, ?)`
    ).run(
      sessionId,
      lastMessage.content,
      result.correction ? JSON.stringify(result.correction) : null,
      result.turnType,
      result.translation ? JSON.stringify(result.translation) : null,
      now
    );

    db.prepare(
      `INSERT INTO turns (session_id, role, content, correction_json, turn_type, translation_json, created_at)
       VALUES (?, 'assistant', ?, NULL, NULL, NULL, ?)`
    ).run(sessionId, buildAssistantDisplayContent(result), now);

    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "MISSING_API_KEY") {
      return res.status(400).json({ error: "MISSING_API_KEY" });
    }
    console.error("Chat error:", err);
    res.status(502).json({ error: "Failed to reach the language model. Please try again." });
  }
});

// Used when the app is set to speak first: generates an opening line with no
// preceding learner message, and stores only the resulting assistant turn.
chatRouter.post("/opening", async (req, res) => {
  const { sessionId } = req.body as { sessionId?: number };

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  const session = db
    .prepare("SELECT id, mode, difficulty FROM sessions WHERE id = ?")
    .get(sessionId) as SessionRow | undefined;

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const config = loadConfig();
  if (!config.anthropicApiKey) {
    return res.status(400).json({ error: "MISSING_API_KEY" });
  }

  try {
    const result = await getOpeningReply(config.anthropicApiKey, session.mode, session.difficulty);
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO turns (session_id, role, content, correction_json, turn_type, translation_json, created_at)
       VALUES (?, 'assistant', ?, NULL, NULL, NULL, ?)`
    ).run(sessionId, result.reply, now);

    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "MISSING_API_KEY") {
      return res.status(400).json({ error: "MISSING_API_KEY" });
    }
    console.error("Opening reply error:", err);
    res.status(502).json({ error: "Failed to reach the language model. Please try again." });
  }
});
