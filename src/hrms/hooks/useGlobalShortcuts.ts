import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SHORTCUT_MAP: Record<string, string> = {
  // Function keys
  "F2":          "/sales/sales-invoice/new",
  "F8":          "/accounts/payments/new",
  "F9":          "/accounts/receipts/new",

  // Alt + Function keys
  "alt+F2":      "/sales/sales-return/new",
  "alt+F8":      "/accounts/journals/new",
  "alt+F9":      "/accounts/contra/new",

  // Alt + Letter keys
  "alt+e":       "/sales/sales-order/new",
  "alt+m":       "/sales/sales-dc/new",
  "alt+q":       "/sales/quotation/new",
  "alt+b":       "/purchase/purchase-bill/new",
  "alt+d":       "/purchase/purchase-dc/new",
  "alt+o":       "/purchase/purchase-order/new",
  "alt+r":       "/purchase/purchase-return/new",
  "alt+i":       "/internal-stock/order/new",
  "alt+t":       "/internal-stock/transfer/new",
  "alt+k":       "/internal-stock/acknowledge/new",
  "alt+g":       "/masters/items",
};

function isTypingInInput(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (el as HTMLElement).isContentEditable
  );
}

function getShortcutKey(e: KeyboardEvent): string {
  const alt = e.altKey;
  const key = e.key;

  if (!key) return "";

  // Function keys — allow even without alt
  if (key.startsWith("F") && !isNaN(Number(key.slice(1)))) {
    return alt ? `alt+${key}` : key;
  }

  // Letter/other keys — require alt
  if (alt) {
    return `alt+${key.toLowerCase()}`;
  }

  return "";
}

export function useGlobalShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcutKey = getShortcutKey(e);
      if (!shortcutKey) return;

      const route = SHORTCUT_MAP[shortcutKey];
      if (!route) return;

      if (isTypingInInput()) {
        if (!shortcutKey.startsWith("F") && !shortcutKey.startsWith("alt+F")) return;
      }

      e.preventDefault();
      e.stopPropagation();
      navigate(route);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [navigate]);
}
