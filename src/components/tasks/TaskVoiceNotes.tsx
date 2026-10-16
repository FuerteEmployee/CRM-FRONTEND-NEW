import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Download,
  Loader2,
  RotateCcw,
  Volume2,
  VolumeX,
  Check,
  X
} from "lucide-react";
import { formatDate } from "@/lib/dateFormat";
import { useToast } from "@/hooks/use-toast";

export interface TaskFileItem {
  _id: string;
  file_name: string;
  filetype?: string;
  size?: number;
  attachment_key: string;
  dateadded?: string | Date;
  createdAt?: string | Date;
  addedfrom?: {
    _id?: string;
    firstname?: string;
    lastname?: string;
  } | string;
}

export interface StaffOption {
  value: string;
  label: string;
}

export const isAudioFile = (f?: { filetype?: string; file_name?: string } | null): boolean => {
  if (!f) return false;
  const type = (f.filetype || "").toLowerCase();
  const name = (f.file_name || "").toLowerCase();
  return (
    type.startsWith("audio/") ||
    name.endsWith(".webm") ||
    name.endsWith(".mp3") ||
    name.endsWith(".wav") ||
    name.endsWith(".ogg") ||
    name.endsWith(".m4a") ||
    name.includes("voice-note")
  );
};

// Formats seconds into mm:ss
const formatDuration = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

// Formats bytes into human readable size
const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface VoiceNotePlayerProps {
  file: TaskFileItem;
  fileUrl: string;
  onDelete: (id: string) => void;
  staffOptions?: StaffOption[];
}

export const VoiceNotePlayer = ({
  file,
  fileUrl,
  onDelete,
  staffOptions = [],
}: VoiceNotePlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };
    const onDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const newTime = parseFloat(e.target.value);
    if (audio) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextSpeed: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    audio.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Get author name
  const authorName = (() => {
    if (typeof file?.addedfrom === "object" && file.addedfrom?.firstname) {
      return `${file.addedfrom.firstname} ${file.addedfrom.lastname || ""}`.trim();
    }
    if (typeof file?.addedfrom === "string") {
      const found = staffOptions.find((s) => s.value === file.addedfrom);
      if (found) return found.label;
    }
    return "Staff Member";
  })();

  const authorInitials = authorName
    .split(" ")
    .map((w: string) => w.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase() || "VN";

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this voice note?")) {
      setIsDeleting(true);
      onDelete(file._id);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/80 rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-all space-y-3 group">
      {/* Hidden Audio Tag */}
      <audio ref={audioRef} src={fileUrl} preload="metadata" />

      {/* Header: Author + Timestamp + Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-8 w-8 border border-indigo-100 shadow-sm shrink-0">
            <AvatarFallback className="bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-[11px]">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{authorName}</p>
            <p className="text-[10px] font-semibold text-slate-400">
              {formatDate(file?.dateadded || file?.createdAt)}
              {file?.size ? ` · ${formatFileSize(file.size)}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Download button */}
          <a
            href={fileUrl}
            download={file.file_name || "voice-note.webm"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
            title="Download Voice Note"
          >
            <Download className="h-3.5 w-3.5" />
          </a>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete Voice Note"
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Audio Controls Bar */}
      <div className="bg-white/90 border border-slate-200/60 rounded-xl p-2.5 flex items-center gap-3 shadow-inner">
        {/* Play / Pause button */}
        <Button
          type="button"
          onClick={togglePlay}
          size="icon"
          className={`h-9 w-9 rounded-full shrink-0 shadow-md transition-all ${
            isPlaying
              ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200"
              : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
          }`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>

        {/* Scrubber & Waveform */}
        <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
          <div className="relative flex items-center w-full">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none"
              style={{
                background: `linear-gradient(to right, rgb(147, 51, 234) ${progressPercent}%, rgb(226, 232, 240) ${progressPercent}%)`,
              }}
            />
          </div>

          {/* Time display */}
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 font-mono">
            <span>{formatDuration(currentTime)}</span>
            <div className="flex items-center gap-1.5">
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-2.5">
                  <span className="w-0.5 bg-purple-500 animate-pulse h-2 rounded-full" />
                  <span className="w-0.5 bg-purple-500 animate-pulse delay-75 h-3 rounded-full" />
                  <span className="w-0.5 bg-purple-500 animate-pulse delay-150 h-1.5 rounded-full" />
                </div>
              )}
              <span>{formatDuration(duration || 0)}</span>
            </div>
          </div>
        </div>

        {/* Speed Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleSpeed}
          className="h-7 px-2 text-[10px] font-black rounded-lg text-slate-600 hover:bg-slate-100 hover:text-purple-600 font-mono"
          title="Change playback speed"
        >
          {playbackRate}x
        </Button>

        {/* Mute Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="h-7 w-7 text-slate-400 hover:text-slate-700 rounded-lg shrink-0"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
};

interface TaskVoiceNotesProps {
  taskId: string;
  files: TaskFileItem[];
  onUpload: (file: File) => Promise<unknown> | void;
  onDelete: (fileId: string) => void;
  isUploading?: boolean;
  staffOptions?: StaffOption[];
  getFileUrl: (attachmentKey: string) => string;
}

export const TaskVoiceNotes = ({
  taskId: _taskId,
  files = [],
  onUpload,
  onDelete,
  isUploading = false,
  staffOptions = [],
  getFileUrl,
}: TaskVoiceNotesProps) => {
  const { toast } = useToast();

  // Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Filter voice notes from all files
  const voiceNotes = files.filter(isAudioFile);

  // Clean up stream & timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
      }
    };
  }, [previewAudioUrl]);

  // Start Voice Recording
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Not Supported",
          description: "Your browser does not support audio recording.",
          variant: "destructive",
        });
        return;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Detect best supported mime type
      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/wav",
      ];
      let selectedMimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        for (const t of preferredTypes) {
          if (MediaRecorder.isTypeSupported(t)) {
            selectedMimeType = t;
            break;
          }
        }
      }

      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewAudioUrl(url);

        // Turn off mic track hardware indicator
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
      };

      recorder.start(250); // collect 250ms chunks
      setIsRecording(true);
      setRecordSeconds(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error("Mic access error:", err);
      toast({
        title: "Microphone Access Denied",
        description:
          "Please allow microphone permission in your browser settings to record voice notes.",
        variant: "destructive",
      });
    }
  };

  // Stop Recording & Enter Preview
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  // Cancel Recording without saving
  const cancelRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordSeconds(0);
    setRecordedBlob(null);

    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
      setPreviewAudioUrl(null);
    }
  };

  // Discard Preview & Re-record
  const discardPreview = () => {
    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
      setPreviewAudioUrl(null);
    }
    setRecordedBlob(null);
    setRecordSeconds(0);
    setIsPreviewPlaying(false);
  };

  // Save Recorded Voice Note to Task
  const saveVoiceNote = async () => {
    if (!recordedBlob) return;
    try {
      setIsSaving(true);

      const mimeType = recordedBlob.type || "audio/webm";
      let ext = "webm";
      if (mimeType.includes("mp4")) ext = "m4a";
      else if (mimeType.includes("ogg")) ext = "ogg";
      else if (mimeType.includes("wav")) ext = "wav";

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateTag = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      const fileName = `voice-note-${dateTag}.${ext}`;

      const file = new File([recordedBlob], fileName, { type: mimeType });
      await onUpload(file);

      toast({
        title: "Voice Note Added",
        description: "Your voice note was uploaded to this task.",
      });

      discardPreview();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Could not save voice note.";
      toast({
        title: "Upload Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Preview Audio Toggle
  const togglePreviewPlay = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
    } else {
      audio.play().then(() => setIsPreviewPlaying(true)).catch(console.error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              Voice Notes
              {voiceNotes.length > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full text-xs"
                >
                  {voiceNotes.length}
                </Badge>
              )}
            </h3>
          </div>
        </div>

        {/* Start Recording Button (shown when not recording or previewing) */}
        {!isRecording && !previewAudioUrl && (
          <Button
            type="button"
            size="sm"
            onClick={startRecording}
            className="rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200 gap-1.5 h-9"
          >
            <Mic className="h-4 w-4" />
            Record Voice Note
          </Button>
        )}
      </div>

      {/* 1. Active Recording Mode Panel */}
      {isRecording && (
        <div className="bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-4 shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {/* Pulsing Red Indicator */}
              <div className="relative flex items-center justify-center h-9 w-9 rounded-full bg-red-100">
                <span className="absolute h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="h-4 w-4 rounded-full bg-red-600 animate-pulse" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                  Recording Audio...
                </p>
                <p className="text-xl font-black font-mono text-slate-800">
                  {formatDuration(recordSeconds)}
                </p>
              </div>

              {/* Animated Sound Wave Bars */}
              <div className="flex items-end gap-1 h-6 ml-2">
                <span className="w-1 bg-red-500 rounded-full animate-pulse h-4" />
                <span className="w-1 bg-red-500 rounded-full animate-pulse delay-75 h-6" />
                <span className="w-1 bg-red-500 rounded-full animate-pulse delay-150 h-3" />
                <span className="w-1 bg-red-500 rounded-full animate-pulse delay-200 h-5" />
                <span className="w-1 bg-red-500 rounded-full animate-pulse delay-100 h-2" />
              </div>
            </div>

            {/* Actions: Cancel & Stop */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelRecording}
                className="h-9 rounded-xl border-slate-300 text-slate-600 hover:bg-slate-100 font-bold gap-1.5"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={stopRecording}
                className="h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-md shadow-red-200 gap-1.5 px-4"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop & Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Review Preview Panel (After recording stops) */}
      {previewAudioUrl && !isRecording && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-4 shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <audio
            ref={previewAudioRef}
            src={previewAudioUrl}
            onEnded={() => setIsPreviewPlaying(false)}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              Recording Captured ({formatDuration(recordSeconds)})
            </span>
            <span className="text-xs text-slate-500 font-medium">Listen before saving</span>
          </div>

          <div className="flex items-center gap-3 bg-white/90 p-3 rounded-xl border border-purple-100 shadow-sm">
            <Button
              type="button"
              onClick={togglePreviewPlay}
              size="icon"
              className="h-9 w-9 rounded-full bg-purple-600 hover:bg-purple-700 text-white shrink-0 shadow-md shadow-purple-200"
            >
              {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>

            <div className="flex-1">
              <p className="text-xs font-bold text-slate-700">Preview Voice Note</p>
              <p className="text-[10px] text-slate-400 font-medium">Click play to review audio</p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={discardPreview}
              disabled={isSaving}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 font-bold gap-1 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retake
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={saveVoiceNote}
              disabled={isSaving || isUploading}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black shadow-md shadow-emerald-200 gap-1.5 text-xs px-4"
            >
              {isSaving || isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save to Task
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 3. Voice Notes List */}
      <div className="space-y-3">
        {voiceNotes.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {voiceNotes.map((file) => (
              <VoiceNotePlayer
                key={file._id}
                file={file}
                fileUrl={getFileUrl(file.attachment_key)}
                onDelete={onDelete}
                staffOptions={staffOptions}
              />
            ))}
          </div>
        ) : (
          !isRecording &&
          !previewAudioUrl && (
            <div
              onClick={startRecording}
              className="border-2 border-dashed border-slate-200 rounded-2xl bg-white/60 p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-all group"
            >
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                <Mic className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-600 group-hover:text-purple-700 transition-colors">
                No voice notes recorded yet
              </p>
              <p className="text-[11px] text-slate-400 text-center max-w-xs">
                Click here or tap "Record Voice Note" to capture and attach audio instructions to this task.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

interface InlineVoiceRecorderProps {
  onRecorded: (file: File) => void;
  className?: string;
}

export const InlineVoiceRecorder = ({ onRecorded, className = "" }: InlineVoiceRecorderProps) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const start = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({ title: "Error", description: "Audio recording not supported in this browser.", variant: "destructive" });
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg", "audio/wav"];
      let mime = "";
      if (typeof MediaRecorder !== "undefined") {
        for (const t of preferredTypes) {
          if (MediaRecorder.isTypeSupported(t)) {
            mime = t;
            break;
          }
        }
      }
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        const actualMime = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        setPreviewBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      rec.start(250);
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone permissions to record a voice note.",
        variant: "destructive",
      });
    }
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
    setIsRecording(false);
    setSeconds(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewBlob(null);
    setIsPlayingPreview(false);
  };

  const togglePreviewPlay = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (isPlayingPreview) {
      audio.pause();
      setIsPlayingPreview(false);
    } else {
      audio.play().then(() => setIsPlayingPreview(true)).catch(console.error);
    }
  };

  const confirmAttach = () => {
    if (!previewBlob) return;
    const actualMime = previewBlob.type || "audio/webm";
    let ext = "webm";
    if (actualMime.includes("mp4")) ext = "m4a";
    else if (actualMime.includes("ogg")) ext = "ogg";
    else if (actualMime.includes("wav")) ext = "wav";

    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const dateTag = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const fileName = `voice-note-${dateTag}.${ext}`;
    const file = new File([previewBlob], fileName, { type: actualMime });
    onRecorded(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewBlob(null);
    setIsPlayingPreview(false);
    setSeconds(0);
  };

  // Preview Mode: Listen before attaching
  if (previewUrl && !isRecording) {
    return (
      <div className={`flex items-center gap-2 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 px-3 py-1.5 rounded-xl shadow-sm ${className}`}>
        <audio
          ref={previewAudioRef}
          src={previewUrl}
          onEnded={() => setIsPlayingPreview(false)}
        />
        <Button
          type="button"
          size="icon"
          onClick={togglePreviewPlay}
          className="h-7 w-7 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-sm shrink-0"
          title={isPlayingPreview ? "Pause Preview" : "Play Preview"}
        >
          {isPlayingPreview ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </Button>
        <span className="text-xs font-mono font-bold text-purple-700">
          {formatDuration(seconds)}
        </span>
        <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
          (Preview Voice)
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={cancel}
          className="h-7 px-2 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg gap-1"
          title="Discard and retake"
        >
          <RotateCcw className="h-3 w-3" /> Retake
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={confirmAttach}
          className="h-7 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 shadow-sm"
          title="Attach this voice note to task"
        >
          <Check className="h-3.5 w-3.5" /> Attach
        </Button>
      </div>
    );
  }

  // Recording Mode: Active live recording
  if (isRecording) {
    return (
      <div className={`flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl ${className}`}>
        <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
        <span className="text-xs font-mono font-black text-red-600">{formatDuration(seconds)}</span>
        <Button
          type="button"
          size="sm"
          onClick={stop}
          className="h-7 px-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg gap-1"
          title="Stop and review recording"
        >
          <Square className="h-3 w-3 fill-current" /> Stop & Review
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={cancel}
          className="h-7 w-7 text-slate-400 hover:text-red-500 rounded-lg"
          title="Cancel recording"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={start}
      className={`rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 font-bold gap-1.5 text-xs h-9 ${className}`}
    >
      <Mic className="h-4 w-4 text-purple-600" />
      Record Voice Note
    </Button>
  );
};

export const AttachedVoicePreview = ({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl border bg-purple-50/80 border-purple-200">
      <audio ref={audioRef} src={url} onEnded={() => setIsPlaying(false)} />
      <div className="flex items-center gap-2.5 min-w-0">
        <Button
          type="button"
          size="icon"
          onClick={toggle}
          className="h-7 w-7 rounded-full bg-purple-600 hover:bg-purple-700 text-white shrink-0 shadow-sm"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </Button>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
          <span className="text-[10px] font-bold text-purple-600">Voice Note (Tap to preview)</span>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
        onClick={onRemove}
        title="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
