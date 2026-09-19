import { useEffect, useState } from "react";
import { getProfileSettings, updateGlobalKeySettings, updateProfileSettings } from "../api";
import type { ProfileSettings } from "../types";

interface Props {
  profileId: number;
  profileName: string;
  onClose: () => void;
  onSettingsChanged: (settings: ProfileSettings) => void;
}

export function SettingsPage({ profileId, profileName, onClose, onSettingsChanged }: Props) {
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [ttsProvider, setTtsProvider] = useState<ProfileSettings["ttsProvider"]>("browser");
  const [ttsVoice, setTtsVoice] = useState("");
  const [huTtsVoice, setHuTtsVoice] = useState("");
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [explanationLanguage, setExplanationLanguage] = useState<ProfileSettings["explanationLanguage"]>("hu");
  const [correctionSpeechLevel, setCorrectionSpeechLevel] =
    useState<ProfileSettings["correctionSpeechLevel"]>("corrected_and_explanation");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    getProfileSettings(profileId).then((s) => {
      setSettings(s);
      setTtsProvider(s.ttsProvider);
      setTtsVoice(s.ttsVoice);
      setHuTtsVoice(s.huTtsVoice);
      setSpeechSpeed(s.speechSpeed);
      setExplanationLanguage(s.explanationLanguage);
      setCorrectionSpeechLevel(s.correctionSpeechLevel);
    });
  }, [profileId]);

  async function handleSave() {
    setStatus("saving");
    try {
      const keysPartial: Record<string, unknown> = {};
      if (anthropicApiKey.trim()) keysPartial.anthropicApiKey = anthropicApiKey.trim();
      if (elevenLabsApiKey.trim()) keysPartial.elevenLabsApiKey = elevenLabsApiKey.trim();
      if (openaiApiKey.trim()) keysPartial.openaiApiKey = openaiApiKey.trim();

      if (Object.keys(keysPartial).length > 0) {
        await updateGlobalKeySettings(keysPartial);
      }

      const updated = await updateProfileSettings(profileId, {
        ttsProvider,
        ttsVoice,
        huTtsVoice,
        speechSpeed,
        explanationLanguage,
        correctionSpeechLevel,
      });

      setSettings(updated);
      onSettingsChanged(updated);
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
      <div className="section-title">{profileName} profil beállításai</div>

      <div className="field">
        <label htmlFor="anthropic-key">
          Anthropic API kulcs (megosztott){" "}
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
        <div className="hint">
          A kulcs a szerveren tárolódik, soha nem kerül a böngészőbe. Ez minden profil számára közös.
        </div>
      </div>

      <div className="field">
        <label htmlFor="tts-provider">Hangfelolvasás (TTS)</label>
        <select id="tts-provider" value={ttsProvider} onChange={(e) => setTtsProvider(e.target.value as ProfileSettings["ttsProvider"])}>
          <option value="browser">Böngésző beépített hangja (ingyenes)</option>
          <option value="elevenlabs">ElevenLabs</option>
          <option value="openai">OpenAI TTS</option>
        </select>
      </div>

      {ttsProvider === "elevenlabs" && (
        <div className="field">
          <label htmlFor="elevenlabs-key">
            ElevenLabs API kulcs (megosztott){" "}
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
          OpenAI API kulcs (megosztott, TTS és Whisper fallback){" "}
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
        <label htmlFor="tts-voice">Angol hang neve (opcionális)</label>
        <input
          id="tts-voice"
          type="text"
          placeholder="pl. alloy, vagy ElevenLabs voice ID"
          value={ttsVoice}
          onChange={(e) => setTtsVoice(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="hu-tts-voice">Magyar hang neve (opcionális)</label>
        <input
          id="hu-tts-voice"
          type="text"
          placeholder="pl. böngésző esetén a magyar hang neve, vagy ElevenLabs/OpenAI voice ID"
          value={huTtsVoice}
          onChange={(e) => setHuTtsVoice(e.target.value)}
        />
        <div className="hint">A javítások magyar magyarázatának felolvasásához használt hang.</div>
      </div>

      <div className="field">
        <label htmlFor="correction-speech">Javítások felolvasása</label>
        <select
          id="correction-speech"
          value={correctionSpeechLevel}
          onChange={(e) => setCorrectionSpeechLevel(e.target.value as ProfileSettings["correctionSpeechLevel"])}
        >
          <option value="off">Kikapcsolva</option>
          <option value="corrected_only">Csak a javított mondat</option>
          <option value="corrected_and_explanation">Javított mondat + magyar magyarázat</option>
        </select>
        <div className="hint">
          Hiba esetén az app a válasz előtt lassan felolvassa a javított angol mondatot
          {correctionSpeechLevel === "corrected_and_explanation" ? ", majd a magyar magyarázatot" : ""}.
        </div>
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
          onChange={(e) => setExplanationLanguage(e.target.value as ProfileSettings["explanationLanguage"])}
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
