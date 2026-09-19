import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../api";

// Minimal typings for the (still non-standard) Web Speech API, which isn't
// part of the default TS DOM lib.
interface SpeechRecognitionResultEvent extends Event {
  results: {
    [index: number]: { [index: number]: { transcript: string } };
    length: number;
  };
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

interface UseSpeechRecognitionOptions {
  onResult: (text: string) => void;
  onError: (message: string) => void;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export function useSpeechRecognition({ onResult, onError }: UseSpeechRecognitionOptions) {
  const RecognitionCtor = getSpeechRecognitionCtor();
  const hasMediaRecorderFallback =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window !== "undefined" &&
    "MediaRecorder" in window;

  const method: SpeechInputMethod = RecognitionCtor ? "webspeech" : hasMediaRecorderFallback ? "mediarecorder" : "none";

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startWebSpeech = useCallback(() => {
    if (!RecognitionCtor) return;
    const recognition = new RecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) onResult(transcript.trim());
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        onError("A mikrofon használatához engedélyt kell adnod a böngészőben.");
      } else if (event.error === "no-speech") {
        onError("Nem hallottalak. Próbáld újra!");
      } else {
        onError(`Beszédfelismerési hiba: ${event.error}`);
      }
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      onError("Nem sikerült elindítani a beszédfelismerést.");
    }
  }, [RecognitionCtor, onResult, onError]);

  const startMediaRecorder = useCallback(async () => {
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
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;
        try {
          const text = await transcribeAudio(blob);
          if (text.trim()) onResult(text.trim());
        } catch (err) {
          onError(err instanceof Error ? err.message : "Nem sikerült felismerni a beszédet.");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        onError("A mikrofon használatához engedélyt kell adnod a böngészőben.");
      } else {
        onError("Nem sikerült elérni a mikrofont.");
      }
    }
  }, [onResult, onError]);

  const start = useCallback(() => {
    if (method === "webspeech") startWebSpeech();
    else if (method === "mediarecorder") void startMediaRecorder();
    else onError("A böngésződ nem támogatja a hangfelismerést. Próbáld Chrome vagy Edge böngészővel.");
  }, [method, startWebSpeech, startMediaRecorder, onError]);

  const stop = useCallback(() => {
    if (method === "webspeech") {
      recognitionRef.current?.stop();
    } else if (method === "mediarecorder") {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }
  }, [method]);

  return { method, isListening, start, stop };
}
