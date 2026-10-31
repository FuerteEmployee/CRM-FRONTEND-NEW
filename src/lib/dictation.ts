import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Voice dictation for a single field (the mic inside Input, Textarea, the rich
// text editor, notes, meeting transcripts). Each one runs its own browser
// SpeechRecognition, but Chrome only keeps one recognition alive per page, so:
//  - starting a field mic stops whichever other field mic is running, and
//  - busy listeners (the FuerteAI hands-free wake word) are paused first —
//    otherwise their watchdog restarts within a second and kills the field mic.
// Text is delivered through a callback bound to that field, so it never
// depends on the field having focus.

type BusyListener = (busy: boolean) => unknown;
const busyListeners = new Set<BusyListener>();
let activeOwner: object | null = null;
let stopActive: (() => void) | null = null;

/** Subscribe to "a field mic started / finished". Returns an unsubscribe function. */
export const onDictationBusyChange = (fn: BusyListener) => {
  busyListeners.add(fn);
  return () => {
    busyListeners.delete(fn);
  };
};

// Listeners may return a promise (e.g. stopping their own recognition); wait
// for them, but never longer than half a second.
const notifyBusy = (busy: boolean) =>
  Promise.race([
    Promise.all([...busyListeners].map((fn) => Promise.resolve(fn(busy)).catch(() => undefined))),
    new Promise((resolve) => setTimeout(resolve, 500)),
  ]);

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access denied. Click the lock icon in the address bar → Microphone → Allow, then try again.",
  "service-not-allowed": "This browser doesn't allow voice typing here. Use Google Chrome or Microsoft Edge.",
  "audio-capture": "No working microphone found. Check that a mic is connected.",
  network: "Can't reach the browser's speech service. Check your internet connection and try again.",
};

const getRecognitionCtor = () => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

/** Appends text to an input/textarea the way typing would, so React's onChange (and form libraries) see it. */
export const appendToField = (node: HTMLInputElement | HTMLTextAreaElement, text: string) => {
  const current = node.value;
  const next = current && !/\s$/.test(current) ? `${current} ${text}` : `${current}${text}`;
  const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(node, next);
  node.dispatchEvent(new Event("input", { bubbles: true }));
};

type DictationOptions = {
  /** Keep listening across pauses instead of stopping after one phrase. */
  continuous?: boolean;
  /**
   * Restart automatically when the browser ends the session on its own (Chrome
   * stops after a few seconds of silence), so the mic stays on until the user
   * clicks it off, the field unmounts, or another field's mic takes over.
   */
  keepAlive?: boolean;
};

// If the browser keeps ending the session right after it starts, something
// else is holding the mic — give up instead of restarting forever.
const QUICK_END_MS = 1000;
const MAX_QUICK_RESTARTS = 5;

/** Voice dictation for one field. `onText` receives each finished phrase. */
export function useDictation(onText: (text: string) => void, { continuous = true, keepAlive = true }: DictationOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [owner] = useState(() => ({}));
  const recognitionRef = useRef<any>(null);
  const wantedRef = useRef(false);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const release = useCallback(() => {
    setIsRecording(false);
    if (activeOwner !== owner) return;
    activeOwner = null;
    stopActive = null;
    notifyBusy(false);
  }, [owner]);

  const stop = useCallback(() => {
    wantedRef.current = false;
    if (recognitionRef.current) recognitionRef.current.stop();
    else release();
  }, [release]);

  const start = useCallback(async () => {
    const Recognition = getRecognitionCtor();
    if (!Recognition) {
      toast.error("Voice typing is not supported in this browser. Use Google Chrome or Microsoft Edge.");
      return;
    }
    const stopPrevious = activeOwner !== owner ? stopActive : null;
    activeOwner = owner;
    stopActive = stop;
    stopPrevious?.();
    wantedRef.current = true;
    setIsRecording(true);
    await notifyBusy(true);
    if (!wantedRef.current) return; // stopped while waiting

    const recognition = new Recognition();
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) text += event.results[i][0].transcript;
      }
      if (text.trim()) onTextRef.current(text.trim());
    };
    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      wantedRef.current = false;
      toast.error(ERROR_MESSAGES[event.error] || `Voice typing failed (${event.error}).`);
    };
    let startedAt = Date.now();
    let quickRestarts = 0;
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      if (wantedRef.current && keepAlive) {
        quickRestarts = Date.now() - startedAt < QUICK_END_MS ? quickRestarts + 1 : 0;
        if (quickRestarts < MAX_QUICK_RESTARTS) {
          try {
            recognition.start();
            startedAt = Date.now();
            return;
          } catch {
            /* fall through and finish */
          }
        }
        toast.error("Voice typing stopped — the microphone is busy. Click the mic to try again.");
      }
      recognitionRef.current = null;
      wantedRef.current = false;
      release();
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Voice typing failed to start:", err);
      wantedRef.current = false;
      release();
    }
  }, [owner, stop, release, continuous, keepAlive]);

  const toggle = useCallback(() => {
    if (wantedRef.current) stop();
    else start();
  }, [start, stop]);

  // Never leave the mic running after the field goes away (modal closed, page changed).
  useEffect(
    () => () => {
      wantedRef.current = false;
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition?.abort();
      release();
    },
    [release]
  );

  return { isRecording, start, stop, toggle };
}
