import { useEffect, useState } from "react";

/**
 * Current <html dir> ("ltr" | "rtl"), updated live. RTL is switched by
 * SettingsContext and by the Setup > Settings preview, both by setting
 * document.documentElement.dir, so components follow that attribute.
 */
export const useDocumentDir = (): "ltr" | "rtl" => {
  const read = () => (document.documentElement.dir === "rtl" ? "rtl" : "ltr");
  const [dir, setDir] = useState<"ltr" | "rtl">(read);

  useEffect(() => {
    const observer = new MutationObserver(() => setDir(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    setDir(read());
    return () => observer.disconnect();
  }, []);

  return dir;
};
