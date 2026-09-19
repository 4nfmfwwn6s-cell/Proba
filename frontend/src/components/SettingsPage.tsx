import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../api";
import type { PublicSettings } from "../types";

interface Props {
  onClose: () => void;
}

export function SettingsPage({ onClose }: Props) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [ttsProvider, setTtsProvider] = useState<PublicSettings["ttsProvider"]>("browser");
  const [ttsVoice, setTtsVoice] = useState("");
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [explanationLanguage, setExplanationLanguage] = useState<PublicSettings["explanationLanguage"]>("hu");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setTtsProvider(s.ttsProvider);
      setTtsVoice(s.ttsVoice);
      setSpeechSpeed(s.speechSpeed);
      setExplanationLanguage(s.explanationLanguage);
    });
  }, []);

  async function handleSave() {
    setStatus("saving");
    const partial: Record<string, unknown> = {
      ttsProvider,
      ttsVoice,
      speechSpeed,
      explanationLanguage,
    };
    if (anthropicApiKey.trim()) partial.anthropicApiKey = anthropicApiKey.trim();
    if (elevenLabsApiKey.trim()) partial.elevenLabsApiKey = elevenLabsApiKey.trim();
    if (openaiApiKey.trim()) partial.openaiApiKey = openaiApiKey.trim();

    try {
      const updated = await updateSettings(partial);
      setSettings(updated);
      setAnthropicApiKey("");
      setElevenLabsApiKey("");
      setOpenaiApiKey("");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  if (!settings) return <div>Betöltés...</div>;

  return (
    <div className="settings-form">
      <div className="field">
        <label htmlFor="anthropic-key">
          Anthropic API kulcs{" "}
          <span className={`key-status ${settings.hasAnthropicKey ? "set" : "unset"}`}>
            {settings.hasAnthropicKey ? "(beállítva)" : "(hiányzik)"}
          </span>
        </label>
        <input
          id="anthropic-key"
          type="password"
          placeholder={settings.hasAnthropicKey ? "•••••••• (hagyd üresen a megtartáshoz)" : "sk-ant-..."}
          value={anthropicApiKey}
          onChange={(e) => setAnthropicApiKey(e.target.value)}
          autoComplete="off"
        />
        <div className="hint">A kulcs a szerveren tárolódik, soha nem kerül a böngészőbe.</div>
      </div>

      <div className="field">
        <label htmlFor="tts-provider">Hangfelolvasás (TTS)</label>
        <select id="tts-provider" value={ttsProvider} onChange={(e) => setTtsProvider(e.target.value as PublicSettings["ttsProvider"])}>
          <option value="browser">Böngésző beépített hangja (ingyenes)</option>
          <option value="elevenlabs">ElevenLabs</option>
          <option value="openai">OpenAI TTS</option>
        </select>
      </div>

      {ttsProvider === "elevenlabs" && (
        <div className="field">
          <label htmlFor="elevenlabs-key">
            ElevenLabs API kulcs{" "}
            <span className={`key-status ${settings.hasElevenLabsKey ? "set" : "unset"}`}>
              {settings.hasElevenLabsKey ? "(beállítva)" : "(hiányzik)"}
            </span>
          </label>
          <input
            id="elevenlabs-key"
            type="password"
            placeholder={settings.hasElevenLabsKey ? "•••••••• (hagyd üresen a megtartáshoz)" : "elevenlabs kulcs"}
            value={elevenLabsApiKey}
            onChange={(e) => setElevenLabsApiKey(e.target.value)}
            autoComplete="off"
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="openai-key">
          OpenAI API kulcs (TTS és Whisper fallback){" "}
          <span className={`key-status ${settings.hasOpenaiKey ? "set" : "unset"}`}>
            {settings.hasOpenaiKey ? "(beállítva)" : "(hiányzik)"}
          </span>
        </label>
        <input
          id="openai-key"
          type="password"
          placeholder={settings.hasOpenaiKey ? "•••••••• (hagyd üresen a megtartáshoz)" : "sk-..."}
          value={openaiApiKey}
          onChange={(e) => setOpenaiApiKey(e.target.value)}
          autoComplete="off"
        />
        <div className="hint">Csak akkor szükséges, ha a böngésződ nem támogatja a beszédfelismerést, vagy OpenAI TTS-t választasz.</div>
      </div>

      <div className="field">
        <label htmlFor="tts-voice">Hang neve (opcionális)</label>
        <input
          id="tts-voice"
          type="text"
          placeholder="pl. alloy, vagy ElevenLabs voice ID"
          value={ttsVoice}
          onChange={(e) => setTtsVoice(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="speech-speed">Beszédsebesség: {speechSpeed.toFixed(2)}x</label>
        <input
          id="speech-speed"
          type="range"
          min="0.5"
          max="1.5"
          step="0.05"
          value={speechSpeed}
          onChange={(e) => setSpeechSpeed(Number(e.target.value))}
        />
      </div>

      <div className="field">
        <label htmlFor="explanation-lang">Magyarázatok nyelve</label>
        <select
          id="explanation-lang"
          value={explanationLanguage}
          onChange={(e) => setExplanationLanguage(e.target.value as PublicSettings["explanationLanguage"])}
        >
          <option value="hu">Magyar</option>
          <option value="en">English</option>
        </select>
      </div>

      <button className="primary-button" onClick={handleSave} disabled={status === "saving"}>
        {status === "saving" ? "Mentés..." : status === "saved" ? "Mentve ✓" : "Mentés"}
      </button>
      {status === "error" && <div className="banner error">Hiba történt a mentés közben.</div>}

      <button className="secondary-button" onClick={onClose}>
        Vissza
      </button>
    </div>
  );
}
