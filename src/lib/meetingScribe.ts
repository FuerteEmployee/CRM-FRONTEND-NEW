// Client-side pre-filter for the live meeting Scribe: only speech that looks
// like a question is sent to the AI (saves cost and noise). The AI itself
// still decides whether to answer.
//
// Chrome returns speech in the script of the chosen language: hi-IN comes back
// in Devanagari ("क्या", not "kya"), gu-IN in Gujarati script. So the word
// lists cover Devanagari, Gujarati, Roman Hindi (typed notes / en-IN speech)
// and English.

const QUESTION_WORDS = [
  // Roman Hindi / Hinglish
  "kya", "kaun", "kab", "kahan", "kaise", "kitna", "kitne", "kitni", "konsa", "kaunsa", "kyun", "kyon",
  "bakaya", "hua", "aaya", "aayi", "bheja", "bheji", "nahi", "batao", "bataiye",
  // Hindi (Devanagari)
  "क्या", "कौन", "कब", "कहाँ", "कहां", "कैसे", "कितना", "कितने", "कितनी", "कौनसा", "कौन सा", "क्यों",
  "बकाया", "हुआ", "आया", "आई", "भेजा", "भेजी", "नहीं", "बताओ", "बताइए", "बताइये",
  // Gujarati
  "શું", "કોણ", "ક્યારે", "ક્યાં", "કેવી રીતે", "કેટલું", "કેટલા", "કેટલી", "કયું", "કયો", "કેમ",
  "બાકી", "આવ્યું", "આવ્યો", "મોકલ્યું", "નહીં", "કહો",
  // English
  "what", "who", "when", "where", "how", "which", "why", "status", "pending", "outstanding", "due",
];

// "Say it again" requests: always worth sending (the AI may repeat an answer).
const REPEAT_PHRASES = ["phir se batao", "repeat karo", "kitna bola tha", "फिर से बताओ", "दोबारा बताओ", "ફરી કહો", "ફરીથી કહો", "say that again"];

const hasWord = (text: string, word: string) => {
  // Latin words must match as whole words ("who" must not match inside "whole");
  // Indic scripts have no reliable \b, so a plain substring check is used there.
  if (/^[a-z ]+$/i.test(word)) return new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, "i").test(text);
  return text.includes(word);
};

/** True when a chunk of meeting speech looks like a question worth sending to the AI. */
export const isQuestionLike = (text: string) => {
  if (!text || !text.trim()) return false;
  if (/[?？]/.test(text)) return true;
  const lower = text.toLowerCase();
  if (REPEAT_PHRASES.some((p) => lower.includes(p))) return true;
  return QUESTION_WORDS.some((w) => hasWord(lower, w.toLowerCase()));
};

export const SCRIBE_LANGUAGES = [
  { value: "hi-IN", label: "Hindi" },
  { value: "gu-IN", label: "Gujarati" },
  { value: "en-IN", label: "English (India)" },
  { value: "en-US", label: "English (US)" },
];
