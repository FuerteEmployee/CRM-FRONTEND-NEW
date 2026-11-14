import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate, type NavigateFunction } from "react-router-dom";
import { usePermissionContext } from "@/context/PermissionContext";
import { tourSequence, type TourTarget } from "./tourSteps";

/**
 * Full-CRM demo tour.
 *
 * The Dashboard "Start Demo Tour" button begins it. The Dashboard steps run
 * first, then the tour moves to each module page in turn (Customers, Leads,
 * Sales, Tasks, HRMS) and continues there. Progress is kept in sessionStorage
 * so it survives the page change; closing the tour (X / Esc) cancels it.
 */

const STATE_KEY = "crm_full_tour";
interface TourState {
  i: number; // index into the module sequence (-1 = still on Dashboard)
  prefix: string; // "/admin" or "/staff"
  started?: boolean; // current module's steps already launched
}

const readState = (): TourState | null => {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as TourState) : null;
  } catch {
    return null;
  }
};
const writeState = (s: TourState | null) => {
  try {
    if (s) sessionStorage.setItem(STATE_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
};

const resolve = (t: TourTarget): Element | null =>
  typeof t === "function" ? t() : document.querySelector(t);
const isVisible = (el: Element | null): el is Element =>
  !!el && (el as HTMLElement).getClientRects().length > 0;

/** Call when the Dashboard tour is launched. */
export function beginFullTour() {
  const prefix = window.location.pathname.startsWith("/staff") ? "/staff" : "/admin";
  writeState({ i: -1, prefix });
}

/** Move on to the next module page, skipping ones the user can't open. */
export function advanceTour(navigate: NavigateFunction) {
  const st = readState();
  if (!st) return;
  const seq = tourSequence(st.prefix);
  const next = st.i + 1;
  if (next >= seq.length) {
    writeState(null);
    return;
  }
  writeState({ ...st, i: next, started: false });
  navigate(seq[next].path);
  // Watchdog: page redirected / has nothing to show -> skip to the following one.
  setTimeout(() => {
    const cur = readState();
    if (cur && cur.i === next && !cur.started) advanceTour(navigate);
  }, 6000);
}

/** Wires a driver instance so finishing continues the chain and closing cancels it. */
export function chainDriver(d: Driver, navigate: NavigateFunction) {
  return () => {
    const finished = !d.hasNextStep();
    d.destroy();
    if (finished) advanceTour(navigate);
    else writeState(null);
  };
}

/** Mounted once inside the router: runs the current module's steps after navigation. */
export function TourContinuation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const st = readState();
    if (!st || st.i < 0 || st.started) return;
    const seq = tourSequence(st.prefix);
    const mod = seq[st.i];
    if (!mod || pathname.replace(/\/$/, "") !== mod.path) return;

    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      const live = mod.steps
        .map((s) => ({ s, el: resolve(s.target) }))
        .filter(({ el }) => isVisible(el));
      // Wait for the heading plus at least one more element (data loaded).
      if (live.length < 2 && tries < 20) return;
      clearInterval(timer);
      if (live.length === 0) return; // watchdog will skip this module
      writeState({ ...st, started: true });
      const isLast = st.i === seq.length - 1;
      const d: Driver = driver({
        showProgress: true,
        animate: true,
        doneBtnText: isLast ? "Finish" : "Next module →",
        steps: live.map<DriveStep>(({ s, el }) => ({
          element: el as Element,
          popover: { title: s.title, description: s.description, side: s.side ?? "bottom", align: "start" },
        })),
        onDestroyStarted: () => chainDriver(d, navigate)(),
      });
      d.drive();
    }, 300);
    return () => clearInterval(timer);
  }, [pathname, navigate]);

  return null;
}

/**
 * Runs `start` automatically the first time this user lands on the page
 * identified by `key` (remembered per user in this browser).
 */
export function useAutoTour(key: string, start: () => void) {
  const { user } = usePermissionContext() as any;
  const uid = user?._id || user?.id || user?.email;
  const startRef = useRef(start);
  startRef.current = start;
  useEffect(() => {
    if (!uid) return;
    const storageKey = `demo_tour_seen:${uid}:${key}`;
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
      startRef.current();
    }, 1800);
    return () => clearTimeout(t);
  }, [uid, key]);
}
