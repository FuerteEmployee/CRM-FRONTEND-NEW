// Records a meeting from the browser: the shared tab's audio (the OTHER
// participants, e.g. a Google Meet tab) mixed with this computer's microphone
// (your OWN voice — tab audio never contains it), optionally with the tab's video.

export type CaptureWarning = "no-tab-audio" | "no-mic";

export class NoMeetingAudioError extends Error {
  constructor() {
    super("No audio to record: share the meeting tab with “Share tab audio” ticked, and allow the microphone.");
    this.name = "NoMeetingAudioError";
  }
}

export interface MeetingCapture {
  /** Things the user should know (e.g. tab audio not shared). */
  warnings: CaptureWarning[];
  mimeType: string;
  video: boolean;
  startedAt: number;
  /** Called if the user stops sharing from the browser's own bar. */
  onShareEnded: (cb: () => void) => void;
  /** Stops everything and returns the recording (null if nothing was recorded). */
  stop: () => Promise<Blob | null>;
}

const pickType = (types: string[]) =>
  typeof MediaRecorder !== "undefined" ? types.find((t) => MediaRecorder.isTypeSupported(t)) || "" : "";

export async function startMeetingCapture(recordVideo: boolean): Promise<MeetingCapture> {
  const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  const tabAudio = display.getAudioTracks();

  let mic: MediaStream | null = null;
  try {
    mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    mic = null;
  }

  if (!tabAudio.length && !mic) {
    display.getTracks().forEach((t) => t.stop());
    throw new NoMeetingAudioError();
  }
  const warnings: CaptureWarning[] = [];
  if (!tabAudio.length) warnings.push("no-tab-audio");
  if (!mic) warnings.push("no-mic");

  // One mixed audio track: tab audio + mic.
  const mixer = new AudioContext();
  const out = mixer.createMediaStreamDestination();
  if (tabAudio.length) mixer.createMediaStreamSource(new MediaStream(tabAudio)).connect(out);
  if (mic) mixer.createMediaStreamSource(mic).connect(out);
  const mixedAudio = out.stream.getAudioTracks()[0];

  const mimeType = recordVideo
    ? pickType(["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"])
    : pickType(["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]);
  // Audio-only still has to share video (the browser requires it); it is just not recorded.
  const stream = recordVideo ? new MediaStream([...display.getVideoTracks(), mixedAudio]) : new MediaStream([mixedAudio]);
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  // A chunk every 10 s keeps memory bounded on long meetings.
  recorder.start(10_000);

  let stopped: Promise<Blob | null> | null = null;
  const stop = () => {
    if (stopped) return stopped;
    stopped = new Promise<Blob | null>((resolve) => {
      const finish = () => {
        display.getTracks().forEach((t) => t.stop());
        mic?.getTracks().forEach((t) => t.stop());
        mixer.close().catch(() => {});
        resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }) : null);
      };
      if (recorder.state === "inactive") return finish();
      recorder.addEventListener("stop", finish, { once: true });
      recorder.stop();
    });
    return stopped;
  };

  return {
    warnings,
    mimeType: recorder.mimeType || mimeType,
    video: recordVideo,
    startedAt: Date.now(),
    onShareEnded: (cb) => display.getVideoTracks()[0]?.addEventListener("ended", cb),
    stop,
  };
}
