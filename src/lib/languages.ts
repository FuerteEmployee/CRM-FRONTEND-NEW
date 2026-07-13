// ─── Canonical language list used by every "Language" selector in the app ───
// Every page previously hardcoded its own short, inconsistent list (some had
// only 2-3 languages, others 22-28). This is the single source of truth for
// the full set of languages, exported in the different value-formats that
// pages across the app already persist to the backend (all `default_language`
// / `language` fields are free-form Strings with no enum, so whichever format
// a page already saves must keep matching — we extend each format's list
// rather than unify the format itself, to avoid orphaning already-saved values).

export type LanguageOption = { value: string; label: string };

// name -> iso-ish code (matches the fr-ca / pt-br / zh style already used by
// Customers.tsx / CustomerView.tsx, extended with Google-Translate-style codes
// for languages that don't have a plain ISO 639-1 code).
const LANGUAGE_TABLE: [string, string][] = [
  ["Afrikaans", "af"], ["Albanian", "sq"], ["Amharic", "am"], ["Arabic", "ar"],
  ["Armenian", "hy"], ["Azerbaijani", "az"], ["Basque", "eu"], ["Belarusian", "be"],
  ["Bengali", "bn"], ["Bosnian", "bs"], ["Bulgarian", "bg"], ["Burmese", "my"],
  ["Catalan", "ca"], ["Cebuano", "ceb"], ["Chinese (Simplified)", "zh"],
  ["Chinese (Traditional)", "zh-tw"], ["Corsican", "co"], ["Croatian", "hr"],
  ["Czech", "cs"], ["Danish", "da"], ["Dutch", "nl"], ["English", "en"],
  ["Esperanto", "eo"], ["Estonian", "et"], ["Filipino", "fil"], ["Finnish", "fi"],
  ["French", "fr"], ["French (Canada)", "fr-ca"], ["Frisian", "fy"],
  ["Galician", "gl"], ["Georgian", "ka"], ["German", "de"], ["Greek", "el"],
  ["Gujarati", "gu"], ["Haitian Creole", "ht"], ["Hausa", "ha"], ["Hawaiian", "haw"],
  ["Hebrew", "he"], ["Hindi", "hi"], ["Hmong", "hmn"], ["Hungarian", "hu"],
  ["Icelandic", "is"], ["Igbo", "ig"], ["Indonesian", "id"], ["Irish", "ga"],
  ["Italian", "it"], ["Japanese", "ja"], ["Javanese", "jv"], ["Kannada", "kn"],
  ["Kazakh", "kk"], ["Khmer", "km"], ["Kinyarwanda", "rw"], ["Korean", "ko"],
  ["Kurdish", "ku"], ["Kyrgyz", "ky"], ["Lao", "lo"], ["Latin", "la"],
  ["Latvian", "lv"], ["Lithuanian", "lt"], ["Luxembourgish", "lb"],
  ["Macedonian", "mk"], ["Malagasy", "mg"], ["Malay", "ms"], ["Malayalam", "ml"],
  ["Maltese", "mt"], ["Maori", "mi"], ["Marathi", "mr"], ["Mongolian", "mn"],
  ["Nepali", "ne"], ["Norwegian", "no"], ["Nyanja (Chichewa)", "ny"],
  ["Odia (Oriya)", "or"], ["Pashto", "ps"], ["Persian", "fa"], ["Polish", "pl"],
  ["Portuguese", "pt"], ["Portuguese (Brazil)", "pt-br"], ["Punjabi", "pa"],
  ["Romanian", "ro"], ["Russian", "ru"], ["Samoan", "sm"], ["Scots Gaelic", "gd"],
  ["Serbian", "sr"], ["Sesotho", "st"], ["Shona", "sn"], ["Sindhi", "sd"],
  ["Sinhala", "si"], ["Slovak", "sk"], ["Slovenian", "sl"], ["Somali", "so"],
  ["Spanish", "es"], ["Sundanese", "su"], ["Swahili", "sw"], ["Swedish", "sv"],
  ["Tajik", "tg"], ["Tamil", "ta"], ["Tatar", "tt"], ["Telugu", "te"],
  ["Thai", "th"], ["Turkish", "tr"], ["Turkmen", "tk"], ["Ukrainian", "uk"],
  ["Urdu", "ur"], ["Uyghur", "ug"], ["Uzbek", "uz"], ["Vietnamese", "vi"],
  ["Welsh", "cy"], ["Xhosa", "xh"], ["Yiddish", "yi"], ["Yoruba", "yo"],
  ["Zulu", "zu"],
];

/** Full language name used as both value and label — the convention used by
 * most pages (Leads, Staff, Estimate Request forms). Matches backend model
 * defaults like Staff.default_language="System Default", Lead.default_language="English". */
export const LANGUAGES: LanguageOption[] = LANGUAGE_TABLE.map(([name]) => ({ value: name, label: name }));

/** Plain name array, for call sites that just map over strings (e.g. Leads.tsx). */
export const LANGUAGE_NAMES: string[] = LANGUAGES.map((l) => l.value);

/** "System Default" + every language — for staff/lead preference selects that
 * let the user defer to the tenant's configured default language. */
export const LANGUAGES_WITH_SYSTEM_DEFAULT: LanguageOption[] = [
  { value: "System Default", label: "System Default" },
  ...LANGUAGES,
];

/** ISO/Google-Translate-style code as value — the convention already used by
 * Customers.tsx / CustomerView.tsx (e.g. "en", "fr-ca", "pt-br"), preserved so
 * any already-saved customer default_language value keeps matching an option. */
export const LANGUAGES_ISO: LanguageOption[] = [
  { value: "system", label: "System Default" },
  ...LANGUAGE_TABLE.map(([name, code]) => ({ value: code, label: name })),
];

/** lowercase/underscored key as value — the convention already used by
 * SetupSettings.tsx's system localization select (e.g. "portuguese_br",
 * "francais_canada"), preserved so an already-configured tenant setting
 * keeps matching an option. A few names had non-obvious historical keys
 * (typos/abbreviations baked into already-saved settings) — preserve those
 * exactly instead of deriving them generically. */
const SETUP_KEY_OVERRIDES: Record<string, string> = {
  "French (Canada)": "francais_canada",
  "Portuguese (Brazil)": "portuguese_br",
  "Indonesian": "indonesia",
  "Chinese (Simplified)": "chinese",
};

export const LANGUAGES_SETUP_KEYS: LanguageOption[] = LANGUAGE_TABLE.map(([name]) => {
  const key = SETUP_KEY_OVERRIDES[name] ?? name
    .toLowerCase()
    .replace(/\s*\(([^)]+)\)/, (_m, inner) => `_${inner.toLowerCase()}`)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return { value: key, label: name };
});
