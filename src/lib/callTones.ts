// Ring tones for Chat calls, generated with the Web Audio API (no sound files).
//   ringtone  -> the person being called (double ring, repeating)
//   ringback  -> the caller while it rings at the other end
// Browsers may block sound until the page has had a click; then it just stays silent.

let ctx: AudioContext | null = null;
let loop: ReturnType<typeof setInterval> | null = null;

const audio = (): AudioContext | null => {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
};

/** Two mixed sine tones for `ms`, starting `delayMs` from now. */
const beep = (freqs: number[], ms: number, delayMs = 0, volume = 0.08) => {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + delayMs / 1000;
  const end = start + ms / 1000;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.setValueAtTime(volume, end - 0.03);
  gain.gain.linearRampToValueAtTime(0, end);
  gain.connect(ac.destination);
  freqs.forEach((f) => {
    const osc = ac.createOscillator();
    osc.frequency.value = f;
    osc.connect(gain);
    osc.start(start);
    osc.stop(end);
  });
};

export const stopTone = () => {
  if (loop) clearInterval(loop);
  loop = null;
};

const repeat = (play: () => void, everyMs: number) => {
  stopTone();
  play();
  loop = setInterval(play, everyMs);
};

/** Incoming call: "ring-ring … ring-ring". */
export const startRingtone = () =>
  repeat(() => {
    beep([400, 450], 400, 0, 0.12);
    beep([400, 450], 400, 600, 0.12);
  }, 3000);

/** Outgoing call: soft tone while the other side rings. */
export const startRingback = () => repeat(() => beep([400, 425], 1000, 0, 0.05), 3000);
