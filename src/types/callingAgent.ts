// Mirrors the enums in Backend/src/models/Call.js and CallTranscript.js.
// There's no shared-types location between the two — the backend is plain
// JS, not TypeScript — so these are hand-kept in sync with the Mongoose
// schemas rather than literally shared. If a schema enum changes, this
// file needs the matching edit.

export type CallDirection = "inbound" | "outbound";
export type CallMatchStatus = "matched" | "not_found" | "ambiguous";
export type CallStatus =
  | "ringing"
  | "answered"
  | "rejected_unknown_number"
  | "missed"
  | "completed"
  | "failed";
export type ProcessingStatus = "pending" | "processing" | "done" | "failed";
export type UtteranceSpeaker = "customer" | "staff";
export type UtteranceSpeakerSource = "channel" | "diarization";
export type CallSentiment = "positive" | "neutral" | "negative" | "mixed";

export interface CallStaffRef {
  _id: string;
  firstname?: string;
  lastname?: string;
}

export interface CallCustomerRef {
  _id: string;
  company?: string;
  phonenumber?: string;
  email?: string;
}

export interface Call {
  _id: string;
  tenant_id: string;
  providerCallId: string;
  direction: CallDirection;
  fromNumber?: string;
  fromNumberE164?: string;
  toNumber?: string;
  customerId?: CallCustomerRef | string | null;
  candidateCustomerIds?: (CallCustomerRef | string)[];
  matchStatus: CallMatchStatus;
  handledByStaffId?: CallStaffRef | string | null;
  status: CallStatus;
  answeredAutomatically?: boolean;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  recordingUrl?: string;
  recordingChannels?: 1 | 2;
  transcriptionStatus: ProcessingStatus;
  transcriptionError?: string | null;
  summaryStatus: ProcessingStatus;
  consentAnnouncementPlayed?: boolean;
  createdAt: string;
  updatedAt: string;
  // Attached by GET /calling-agent/calls (a lookup against CallTranscript,
  // not a field that actually lives on the Call document itself).
  languagesDetected?: string[];
}

export interface CallUtterance {
  speaker: UtteranceSpeaker;
  speakerSource: UtteranceSpeakerSource;
  startMs: number;
  endMs: number;
  text: string;
  detectedLanguage?: string | null;
  languageConfidence?: number | null;
  sttConfidence?: number | null;
}

export interface CallSummary {
  text?: string;
  keyPoints?: string[];
  actionItems?: string[];
  sentiment?: CallSentiment;
  generatedByModel?: string;
  generatedAt?: string;
}

export interface CallTranscript {
  _id: string;
  callId: string;
  utterances: CallUtterance[];
  fullText: string;
  languagesDetected: string[];
  summary?: CallSummary;
}

export interface CallFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: CallStatus | "all";
  matchStatus?: CallMatchStatus | "all";
  customerId?: string;
  staffId?: string;
  language?: string;
  search?: string;
}
