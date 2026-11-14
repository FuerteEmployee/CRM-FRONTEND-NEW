import { describe, expect, it } from "vitest";
import { isQuestionLike } from "@/lib/meetingScribe";

describe("meeting Scribe question filter", () => {
  it.each([
    "शर्मा कंस्ट्रक्शन का payment आया क्या",
    "अंधेरी साइट का handover कब है",
    "इस महीने कितने leads आए",
    "Sharma ka payment aaya kya",
    "શર્મા નું payment આવ્યું કે નહીં",
    "શર્મા નું કેટલું બાકી છે",
    "What is the status of the Andheri project",
    "फिर से बताओ",
    "payment received?",
  ])("sends a question: %s", (text) => {
    expect(isQuestionLike(text)).toBe(true);
  });

  it.each(["हाँ ठीक है", "ચાલો આગળ વધીએ", "Good morning everyone", "the whole team agreed", ""])(
    "ignores a statement: %s",
    (text) => {
      expect(isQuestionLike(text)).toBe(false);
    }
  );
});
