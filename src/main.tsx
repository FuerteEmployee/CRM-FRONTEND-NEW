import "regenerator-runtime/runtime";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./pwa";

// Fix to prevent translation widgets or extensions from shifting body/html layout
const resetLayoutShift = () => {
  const resetStyles = (el: HTMLElement) => {
    if (el.style.top && el.style.top !== "0px") {
      el.style.setProperty("top", "0px", "important");
    }
    if (el.style.marginTop && el.style.marginTop !== "0px") {
      el.style.setProperty("margin-top", "0px", "important");
    }
    if (el.style.paddingTop && el.style.paddingTop !== "0px") {
      el.style.setProperty("padding-top", "0px", "important");
    }
  };

  resetStyles(document.documentElement);
  resetStyles(document.body);

  const observer = new MutationObserver(() => {
    resetStyles(document.documentElement);
    resetStyles(document.body);
  });

  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
};

try {
  resetLayoutShift();
} catch (e) {
  console.error("Layout reset failed:", e);
}

createRoot(document.getElementById("root")!).render(<App />);
