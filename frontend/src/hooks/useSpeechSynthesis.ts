import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTtsAudio } from "../api";
import type { ProfileSettings } from "../types";

export function useSpeechSynthesis(settings: ProfileSettings | null) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  const speakWithBrowser = useCallback(
    (text: string) => {
      if (!browserSupported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = settings?.speechSpeed ?? 1.0;

      const preferredVoice =
        voices.find((v) => v.name === settings?.ttsVoice) ??
        voices.find((v) => v.lang.startsWith("en") && v.localService) ??
        voices.find((v) => v.lang.startsWith("en"));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [browserSupported, settings?.speechSpeed, settings?.ttsVoice, voices]
  );

  const speakWithServer = useCallback(
    async (text: string) => {
      try {
        setIsSpeaking(true);
        const blob = await fetchTtsAudio(
          text,
          settings?.speechSpeed ?? 1.0,
          settings?.ttsProvider ?? "browser",
          settings?.ttsVoice ?? ""
        );
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } catch {
        setIsSpeaking(false);
        // Fall back to the browser voice if the server TTS provider fails.
        speakWithBrowser(text);
      }
    },
    [settings?.speechSpeed, settings?.ttsProvider, settings?.ttsVoice, speakWithBrowser]
  );

  const speak = useCallback(
    (text: string) => {
      if (settings && settings.ttsProvider !== "browser") {
        void speakWithServer(text);
      } else {
        speakWithBrowser(text);
      }
    },
    [settings, speakWithServer, speakWithBrowser]
  );

  const stop = useCallback(() => {
    if (browserSupported) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    setIsSpeaking(false);
  }, [browserSupported]);

  return { speak, stop, isSpeaking, browserSupported, voices };
}
