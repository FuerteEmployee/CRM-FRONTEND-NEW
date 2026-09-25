/**
 * Auto-translate script: en/translation.json → all language files
 * Uses Google Translate free gtx endpoint (no API key needed)
 * Run: node scripts/auto-translate.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const LANGUAGES = [
  "af", "sq", "am", "ar", "hy", "az", "eu", "be", "bn", "bs",
  "bg", "my", "ca", "zh-CN", "zh-TW", "hr", "cs", "da", "nl",
  "eo", "et", "fil", "fi", "fr", "gl", "ka", "de", "el", "gu",
  "ht", "ha", "he", "hi", "hu", "is", "ig", "id", "ga", "it",
  "ja", "jv", "kn", "kk", "km", "ko", "ku", "ky", "lo", "lv",
  "lt", "mk", "mg", "ms", "ml", "mt", "mi", "mr", "mn", "ne",
  "no", "fa", "pl", "pt", "pa", "ro", "ru", "sm", "sr", "si",
  "sk", "sl", "so", "es", "sw", "sv", "tg", "ta", "te", "th",
  "tr", "uk", "ur", "uz", "vi", "cy", "xh", "yi", "yo", "zu"
];

const SOURCE_FILE = path.join(__dirname, "../public/locales/en/translation.json");
const OUTPUT_DIR = path.join(__dirname, "../public/locales");

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function translateText(text, targetLang) {
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encoded}`;

    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const translated = parsed[0].map(s => s[0]).join("");
          resolve(translated);
        } catch (e) {
          resolve(text); // fallback to English
        }
      });
    }).on("error", () => resolve(text));
  });
}

async function translateObject(obj, targetLang) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      result[key] = await translateObject(value, targetLang);
    } else if (typeof value === "string") {
      result[key] = await translateText(value, targetLang);
      await sleep(100); // rate limit protection
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function main() {
  const source = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"));

  for (const lang of LANGUAGES) {
    const outDir = path.join(OUTPUT_DIR, lang);
    const outFile = path.join(outDir, "translation.json");

    // Skip if already exists
    if (fs.existsSync(outFile)) {
      console.log(`[SKIP] ${lang} already exists`);
      continue;
    }

    console.log(`[TRANSLATING] ${lang}...`);
    try {
      const translated = await translateObject(source, lang);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outFile, JSON.stringify(translated, null, 2), "utf8");
      console.log(`[DONE] ${lang} ✅`);
      await sleep(500); // pause between languages
    } catch (err) {
      console.error(`[ERROR] ${lang}:`, err.message);
    }
  }

  console.log("\n✅ All translations complete!");
}

main();
