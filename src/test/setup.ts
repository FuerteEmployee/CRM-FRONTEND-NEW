import "@testing-library/jest-dom";

// Polyfill window.matchMedia for responsive tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Polyfill global localStorage to avoid experimental warning in Node 22
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage?.getItem) {
  const store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
}

// Suppress known non-fatal test warnings (React Router v7 future flags & Radix UI select warnings)
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (
    msg.includes("React Router Future Flag Warning") ||
    msg.includes("Select is changing from controlled to uncontrolled") ||
    msg.includes("ExperimentalWarning: localStorage")
  ) {
    return;
  }
  originalWarn(...args);
};

// Filter process warning events for localStorage
if (typeof process !== "undefined" && process.removeAllListeners) {
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = (warning: any, ...args: any[]) => {
    const message = typeof warning === "string" ? warning : warning?.message || "";
    if (message.includes("localStorage is not available")) {
      return;
    }
    return (originalEmitWarning as any).call(process, warning, ...args);
  };
}
