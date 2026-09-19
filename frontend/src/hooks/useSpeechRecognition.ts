import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../api";
import { appendTranscriptSegment } from "../lib/transcriptMerge";
import type { MicLanguage } from "../types";

// Minimal typings for the (still non-standard) Web Speech API, which isn't
// part of the default TS DOM lib.
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResultEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type SpeechInputMethod = "webspeech" | "mediarecorder" | "none";

const LANG_TAG: Record<MicLanguage, string> = { en: "en-US", hu: "hu-HU" };

interface UseSpeechRecognitionOptions {
  // Called exactly once, only after the mic is toggled off, with the full
  // accumulated utterance (possibly several sentences/pauses long).
  onResult: (text: string) => void;
  onError: (message: string) => void;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

const BENIGN_ERRORS = new Set(["no-speech", "aborted"]);

export function useSpeechRecognition({ onResult, onError }: UseSpeechRecognitionOptions) {
  const RecognitionCtor = getSpeechRecognitionCtor();
  const hasMediaRecorderFallback =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window !== "undefined" &&
    "MediaRecorder" in window;

  const method: SpeechInputMethod = RecognitionCtor ? "webspeech" : hasMediaRecorderFallback ? "mediarecorder" : "none";

  const [isListening, setIsListening] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Whether the user has toggled the mic on - distinct from isListening,
  // since the browser's own recognizer session can end on its own (silence
  // timeout) while we're still supposed to be listening, in which case we
  // transparently start a fresh recognizer session instead of stopping.
  const shouldListenRef = useRef(false);
  const finalTranscriptRef = useRef("");
  // The language explicitly chosen for the current turn (via the EN/HU
  // switch) - fixed for the whole session, including transparent restarts.
  const sessionLangRef = useRef<MicLanguage>("en");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerStartRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const startTimer = useCallback(() => {
    timerStartRef.current = Date.now();
    setElapsedSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      if (timerStartRef.current !== null) {
        setElapsedSeconds(Math.floor((Date.now() - timerStartRef.current) / 1000));
      }
    }, 500);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current !== undefined) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = undefined;
    }
    timerStartRef.current = null;
    setElapsedSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerIntervalRef.current !== undefined) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const startWebSpeechSession = useCallback(() => {
    if (!RecognitionCtor) return;
    const recognition = new RecognitionCtor();
    // The Web Speech API only takes one recognizer language per session, so
    // true simultaneous bilingual recognition isn't possible - the language
    // is whatever was explicitly chosen for this turn (via the EN/HU
    // switch), fixed for every restart of this session.
    recognition.lang = LANG_TAG[sessionLangRef.current];
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscriptRef.current = appendTranscriptSegment(finalTranscriptRef.current, transcript);
        } else {
          interim += transcript;
        }
      }
      setPartialTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        shouldListenRef.current = false;
        setIsListening(false);
        stopTimer();
        onError("A mikrofon használatához engedélyt kell adnod a böngészőben.");
        return;
      }
      if (!BENIGN_ERRORS.has(event.error)) {
        console.warn("Speech recognition error:", event.error);
      }
      // Other errors are handled by the onend handler below, which decides
      // whether to transparently restart or finalize.
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        // The browser's own recognizer session timed out (e.g. after a long
        // silence) but the user hasn't toggled the mic off - start a fresh
        // session transparently and keep accumulating into the same ref.
        startWebSpeechSession();
        return;
      }
      setIsListening(false);
      stopTimer();
      setPartialTranscript("");
      const text = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = "";
      if (text) onResult(text);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      shouldListenRef.current = false;
      setIsListening(false);
      stopTimer();
      onError("Nem sikerült elindítani a beszédfelismerést.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [RecognitionCtor, onError, onResult, stopTimer]);

  const startWebSpeech = useCallback(
    (lang: MicLanguage) => {
      if (!RecognitionCtor) return;
      shouldListenRef.current = true;
      sessionLangRef.current = lang;
      finalTranscriptRef.current = "";
      setPartialTranscript("");
      setIsListening(true);
      startTimer();
      startWebSpeechSession();
    },
    [RecognitionCtor, startTimer, startWebSpeechSession]
  );

  const startMediaRecorder = useCallback(
    async (lang: MicLanguage) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          setIsListening(false);
          stopTimer();
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          if (blob.size === 0) return;
          try {
            const text = await transcribeAudio(blob, lang);
            if (text.trim()) onResult(text.trim());
          } catch (err) {
            onError(err instanceof Error ? err.message : "Nem sikerült felismerni a beszédet.");
          }
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsListening(true);
        startTimer();
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          onError("A mikrofon használatához engedélyt kell adnod a böngészőben.");
        } else {
          onError("Nem sikerült elérni a mikrofont.");
        }
      }
    },
    [onResult, onError, startTimer, stopTimer]
  );

  const start = useCallback(
    (lang: MicLanguage) => {
      if (method === "webspeech") startWebSpeech(lang);
      else if (method === "mediarecorder") void startMediaRecorder(lang);
      else onError("A böngésződ nem támogatja a hangfelismerést. Próbáld Chrome vagy Edge böngészővel.");
    },
    [method, startWebSpeech, startMediaRecorder, onError]
  );

  const stop = useCallback(() => {
    if (method === "webspeech") {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
    } else if (method === "mediarecorder") {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }
  }, [method]);

  return { method, isListening, partialTranscript, elapsedSeconds, start, stop };
}
