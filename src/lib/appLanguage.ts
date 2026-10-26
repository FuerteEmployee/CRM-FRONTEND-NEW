import i18n from "@/i18n/config";
import { languageCodeFromSetupKey } from "./languages";

// Languages offered by the language menus (top bar profile menu, customer
// login) — the ones with translation files in public/locales.
export const APP_LANGUAGES = [
  { code: "ar", name: "Arabic" },
  { code: "bg", name: "Bulgarian" },
  { code: "ca", name: "Catalan" },
  { code: "zh-CN", name: "Chinese" },
  { code: "cs", name: "Czech" },
  { code: "en", name: "English" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "gu", name: "Gujarati" },
  { code: "hi", name: "Hindi" },
  { code: "id", name: "Indonesia" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "fa", name: "Persian" },
  { code: "pt-PT", name: "Portuguese" },
  { code: "pt-BR", name: "Portuguese (BR)" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "es", name: "Spanish" },
  { code: "uk", name: "Ukrainian" },
];

// Set once a person picks a language themselves; until then the company's
// Default Language (Setup > Settings > Localization) is used.
const USER_PICKED_KEY = "crm_language_user_set";

const CODE_ALIASES: Record<string, string> = { zh: "zh-CN", "zh-tw": "zh-TW", pt: "pt-PT", "pt-br": "pt-BR", "fr-ca": "fr" };

/** Localization "Default Language" value -> code used by the language menus (fallback "en"). */
export const appLanguageFromSetting = (setting?: string | null): string => {
  const code = languageCodeFromSetupKey(setting);
  if (!code) return "en";
  return CODE_ALIASES[code] || code;
};

export const currentAppLanguage = (): string => i18n.resolvedLanguage || i18n.language || "en";

export const applyAppLanguage = (code: string, { userPicked = false } = {}) => {
  if (i18n.language !== code) i18n.changeLanguage(code);
  try {
    localStorage.setItem("crm_language", code);
    if (userPicked) localStorage.setItem(USER_PICKED_KEY, "1");
  } catch {
    /* storage blocked */
  }
  document.cookie = `crm_lang=${code}; domain=${window.location.hostname}; path=/; max-age=31536000`;
};

/**
 * Applies the company's language settings: with "Disable Languages" = Yes
 * everyone uses the Default Language; otherwise people who never picked a
 * language themselves get the Default Language.
 */
export const applyCompanyLanguage = (defaultLanguageSetting: any, languagesDisabled: boolean) => {
  if (!defaultLanguageSetting) return;
  let picked = false;
  try {
    picked = localStorage.getItem(USER_PICKED_KEY) === "1";
  } catch {
    /* storage blocked */
  }
  if (languagesDisabled || !picked) {
    const code = appLanguageFromSetting(defaultLanguageSetting);
    if (currentAppLanguage() !== code) applyAppLanguage(code);
  }
};
