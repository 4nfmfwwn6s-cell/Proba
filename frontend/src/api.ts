import type {
  ChatMessage,
  ChatTurnResult,
  ConversationMode,
  Difficulty,
  PublicSettings,
  SessionListItem,
  SessionSummary,
} from "./types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function createSession(mode: ConversationMode, difficulty: Difficulty) {
  return jsonFetch<{ sessionId: number; mode: ConversationMode; difficulty: Difficulty; startedAt: string }>(
    "/api/sessions",
    { method: "POST", body: JSON.stringify({ mode, difficulty }) }
  );
}

export function sendChatTurn(sessionId: number, history: ChatMessage[]) {
  return jsonFetch<ChatTurnResult>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ sessionId, history }),
  });
}

export function endSession(sessionId: number) {
  return jsonFetch<{ endedAt: string; summary: SessionSummary }>(`/api/sessions/${sessionId}/end`, {
    method: "POST",
  });
}

export function listSessions() {
  return jsonFetch<SessionListItem[]>("/api/sessions");
}

export interface SessionDetail {
  id: number;
  mode: ConversationMode;
  difficulty: Difficulty;
  startedAt: string;
  endedAt: string | null;
  turns: { id: number; role: "user" | "assistant"; content: string; correction: unknown; createdAt: string }[];
  summary: SessionSummary;
}

export function getSession(sessionId: number) {
  return jsonFetch<SessionDetail>(`/api/sessions/${sessionId}`);
}

export function getSettings() {
  return jsonFetch<PublicSettings>("/api/settings");
}

export function updateSettings(partial: Record<string, unknown>) {
  return jsonFetch<PublicSettings>("/api/settings", { method: "POST", body: JSON.stringify(partial) });
}

export async function fetchTtsAudio(text: string, speed: number): Promise<Blob> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speed }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || "TTS request failed");
  }
  return res.blob();
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob, "speech.webm");
  const res = await fetch("/api/stt", { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || "STT request failed");
  }
  const data = (await res.json()) as { text: string };
  return data.text;
}
