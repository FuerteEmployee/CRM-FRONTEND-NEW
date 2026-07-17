// ─── Phase 5: FuerteAI voice replies (browser SpeechSynthesis, no API cost) ──
// speak() reads assistant replies aloud. Callers can pass onStart/onEnd so the
// assistant can pause the microphone while talking — otherwise the mic hears
// the assistant's own voice and re-triggers the wake word.

const PREF_KEY = "fuerte_voice_replies";

export const isVoiceReplyEnabled = (): boolean =>
  localStorage.getItem(PREF_KEY) !== "off"; // on by default

export const setVoiceReplyEnabled = (on: boolean) =>
  localStorage.setItem(PREF_KEY, on ? "on" : "off");

export const speechSupported = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window;

// Prefer a natural-sounding English voice when the browser offers several.
const pickVoice = (): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang.startsWith("en") && /google|natural|neural/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0]
  );
};

export const stopSpeaking = () => {
  if (speechSupported()) window.speechSynthesis.cancel();
};

export const speak = (
  text: string,
  opts: { onStart?: () => void; onEnd?: () => void } = {}
) => {
  if (!speechSupported() || !isVoiceReplyEnabled() || !text?.trim()) {
    opts.onEnd?.();
    return;
  }

  // Drop markdown markers and emoji-ish noise so they aren't read literally.
  const clean = text.replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim();

  window.speechSynthesis.cancel(); // never queue over a previous reply

  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1.05;
  utterance.pitch = 1;

  let started = false;
  utterance.onstart = () => {
    started = true;
    opts.onStart?.();
  };
  utterance.onend = () => opts.onEnd?.();
  utterance.onerror = () => opts.onEnd?.();

  window.speechSynthesis.speak(utterance);

  // Safari/Chrome occasionally never fire onstart for empty/cancelled queues —
  // make sure onEnd still runs so the mic is never left paused forever.
  setTimeout(() => {
    if (!started && !window.speechSynthesis.speaking) opts.onEnd?.();
  }, 1500);
};
