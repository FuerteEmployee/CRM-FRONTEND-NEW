import SpeechRecognition from "react-speech-recognition";

// react-speech-recognition 4.x wraps startListening / stopListening in
// /*#__PURE__*/ calls. When a caller ignores the returned promise, the
// production bundler treats the whole call as side-effect free and deletes
// it — so the mic works under `npm run dev` but never starts on the live
// site ("Mic: not listening"). Chaining .catch() uses the promise, which
// keeps the call in the build. Always go through these helpers.

type ListenOptions = { continuous?: boolean; language?: string };

export const startListening = (options: ListenOptions): Promise<void> =>
  SpeechRecognition.startListening(options).catch((err) => {
    console.error("Speech recognition failed to start:", err);
  });

export const stopListening = (): Promise<void> =>
  SpeechRecognition.stopListening().catch((err) => {
    console.error("Speech recognition failed to stop:", err);
  });
