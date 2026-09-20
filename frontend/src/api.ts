import type {
  ChatMessage,
  ChatTurnResult,
  ConversationMode,
  Difficulty,
  GlobalKeySettings,
  MicLanguage,
  Profile,
  ProfileSettings,
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

export function listProfiles() {
  return jsonFetch<Profile[]>("/api/profiles");
}

export function createProfile(name: string) {
  return jsonFetch<Profile>("/api/profiles", { method: "POST", body: JSON.stringify({ name }) });
}

export function getProfileSettings(profileId: number) {
  return jsonFetch<ProfileSettings>(`/api/profiles/${profileId}/settings`);
}

export function updateProfileSettings(profileId: number, partial: Record<string, unknown>) {
  return jsonFetch<ProfileSettings>(`/api/profiles/${profileId}/settings`, {
    method: "POST",
    body: JSON.stringify(partial),
  });
}

export function createSession(profileId: number, mode: ConversationMode, difficulty: Difficulty) {
  return jsonFetch<{ sessionId: number; mode: ConversationMode; difficulty: Difficulty; startedAt: string }>(
    "/api/sessions",
    { method: "POST", body: JSON.stringify({ profileId, mode, difficulty }) }
  );
}

export function sendChatTurn(sessionId: number, history: ChatMessage[]) {
  return jsonFetch<ChatTurnResult>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ sessionId, history }),
  });
}

export function getOpeningReply(sessionId: number) {
  return jsonFetch<ChatTurnResult>("/api/chat/opening", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export function endSession(sessionId: number) {
  return jsonFetch<{ endedAt: string; summary: SessionSummary }>(`/api/sessions/${sessionId}/end`, {
    method: "POST",
  });
}

export function listSessions(profileId: number) {
  return jsonFetch<SessionListItem[]>(`/api/sessions?profileId=${profileId}`);
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

export function getSession(sessionId: number, profileId: number) {
  return jsonFetch<SessionDetail>(`/api/sessions/${sessionId}?profileId=${profileId}`);
}

export function getGlobalKeySettings() {
  return jsonFetch<GlobalKeySettings>("/api/settings");
}

export function updateGlobalKeySettings(partial: Record<string, unknown>) {
  return jsonFetch<GlobalKeySettings>("/api/settings", { method: "POST", body: JSON.stringify(partial) });
}

export async function fetchTtsAudio(
  text: string,
  speed: number,
  ttsProvider: string,
  ttsVoice: string
): Promise<Blob> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speed, ttsProvider, ttsVoice }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || "TTS request failed");
  }
  return res.blob();
}

export async function transcribeAudio(blob: Blob, language: MicLanguage): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob, "speech.webm");
  formData.append("language", language);
  const res = await fetch("/api/stt", { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || "STT request failed");
  }
  const data = (await res.json()) as { text: string };
  return data.text;
}
