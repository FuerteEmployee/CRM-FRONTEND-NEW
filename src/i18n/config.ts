import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(HttpBackend)             // loads translation files from /public/locales/
  .use(LanguageDetector)        // detects browser/cookie language
  .use(initReactI18next)        // binds to React
  .init({
    fallbackLng: "en",          // always fall back to English
    defaultNS: "translation",
    ns: ["translation"],

    backend: {
      loadPath: "/locales/{{lng}}/translation.json",
    },

    detection: {
      // Read language from our googtrans cookie OR localStorage
      order: ["cookie", "localStorage", "navigator", "htmlTag"],
      lookupCookie: "crm_lang",          // our own cookie (not googtrans)
      lookupLocalStorage: "crm_language",
      cacheUserLanguage: true,
      cookieDomain: window.location.hostname,
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;
