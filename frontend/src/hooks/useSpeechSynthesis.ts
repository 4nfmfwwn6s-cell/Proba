import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTtsAudio } from "../api";
import type { ProfileSettings } from "../types";
import type { SpeechPart } from "../lib/correctionSpeech";

const LANG_TAG: Record<SpeechPart["lang"], string> = { en: "en-US", hu: "hu-HU" };

export function useSpeechSynthesis(settings: ProfileSettings | null) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const browserSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!browserSupported) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [browserSupported]);

  const pickBrowserVoice = useCallback(
    (lang: SpeechPart["lang"]): SpeechSynthesisVoice | undefined => {
      const preferredName = lang === "hu" ? settings?.huTtsVoice : settings?.ttsVoice;
      return (
        voices.find((v) => v.name === preferredName) ??
        voices.find((v) => v.lang.startsWith(lang) && v.localService) ??
        voices.find((v) => v.lang.startsWith(lang))
      );
    },
    [voices, settings?.huTtsVoice, settings?.ttsVoice]
  );

  // Speaks a single part with the browser voice, resolving once it's done
  // (never rejects, so a sequence keeps going even if one part fails).
  const speakPartWithBrowser = useCallback(
    (part: SpeechPart): Promise<void> => {
      return new Promise((resolve) => {
        if (!browserSupported || cancelledRef.current) {
          resolve();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(part.text);
        utterance.lang = LANG_TAG[part.lang];
        utterance.rate = part.rate;
        const voice = pickBrowserVoice(part.lang);
        if (voice) utterance.voice = voice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    },
    [browserSupported, pickBrowserVoice]
  );

  const speakPartWithServer = useCallback(
    async (part: SpeechPart): Promise<void> => {
      if (cancelledRef.current) return;
      try {
        const voice =
          part.lang === "hu" ? settings?.huTtsVoice || settings?.ttsVoice || "" : (settings?.ttsVoice ?? "");
        const blob = await fetchTtsAudio(part.text, part.rate, settings?.ttsProvider ?? "browser", voice);
        if (cancelledRef.current) return;

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        setIsSpeaking(true);
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      } catch {
        // Fall back to the browser voice if the server TTS provider fails.
        if (!cancelledRef.current) await speakPartWithBrowser(part);
      }
    },
    [settings?.ttsProvider, settings?.ttsVoice, settings?.huTtsVoice, speakPartWithBrowser]
  );

  // Speaks each part in order, waiting for one to finish before starting the
  // next - so e.g. the corrected sentence, the Hungarian explanation, and the
  // reply never overlap. stop() aborts the remaining parts of the sequence.
  const speakSequence = useCallback(
    async (parts: SpeechPart[]) => {
      cancelledRef.current = false;
      const useServer = Boolean(settings && settings.ttsProvider !== "browser");
      for (const part of parts) {
        if (cancelledRef.current) break;
        if (!part.text.trim()) continue;
        if (useServer) {
          await speakPartWithServer(part);
        } else {
          await speakPartWithBrowser(part);
        }
      }
      setIsSpeaking(false);
    },
    [settings, speakPartWithServer, speakPartWithBrowser]
  );

  const speak = useCallback(
    (text: string) => {
      void speakSequence([{ text, lang: "en", rate: settings?.speechSpeed ?? 1.0 }]);
    },
    [speakSequence, settings?.speechSpeed]
  );

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (browserSupported) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    setIsSpeaking(false);
  }, [browserSupported]);

  return { speak, speakSequence, stop, isSpeaking, browserSupported, voices };
}
