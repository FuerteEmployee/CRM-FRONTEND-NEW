import { useState, useEffect, useRef } from "react";

/**
 * Ensures a loading state stays true for at least `minimumMs` milliseconds.
 * Prevents skeleton from flashing too quickly when the API responds fast.
 */
export function useMinimumLoading(actual: boolean, minimumMs = 700): boolean {
  const [show, setShow] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (actual) {
      // Loading started (or restarted) — reset the clock
      startRef.current = Date.now();
      setShow(true);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      // Loading finished — wait out the remaining minimum time
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, minimumMs - elapsed);
      timerRef.current = setTimeout(() => setShow(false), remaining);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [actual, minimumMs]);

  return show;
}
