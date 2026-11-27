// What happens when someone presses Logout (every Logout button calls guardedLogout()):
//  1. Tasks due today (or overdue) not Complete → no logout; the popup
//     (components/layout/PendingTasksLogoutDialog) lists them and the company
//     admins are told. Admins are never blocked.
//  2. Work timer still running → "Stop Work & Log out" popup
//     (WorkLogoutDialog in components/layout/WorkTimerWidget).
//  3. Otherwise log out; the server writes "logged out" to the activity log.
// If a check itself fails, the logout goes ahead — nobody is ever trapped in
// the app by a server error.
import { utilityService } from "@/api/services/utility.service";

export type PendingTask = {
  _id: string;
  name: string;
  duedate: string;
  overdue: boolean;
  status: number;
  statusLabel: string;
  project: string;
};
export type LogoutBlocked = { pending: PendingTask[]; proceed: () => Promise<void> | void };
export type LogoutWorkRunning = { proceed: () => Promise<void> | void };

const EVENT = "crm:logout-blocked";
const WORK_EVENT = "crm:logout-work-running";

/** Logs out unless tasks are pending or the work timer runs. Returns true when it logged out. */
export async function guardedLogout(doLogout: () => Promise<void> | void): Promise<boolean> {
  // The real logout: record it ("logged out" in the activity log), then leave.
  const leave = async () => {
    try { await utilityService.logoutCheck(true); } catch { /* never block on this */ }
    await doLogout();
  };
  try {
    const r: any = await utilityService.logoutCheck(false);
    if (r?.blocked && Array.isArray(r.pending) && r.pending.length) {
      utilityService.logoutCheck(true).catch(() => {}); // tells the admins
      window.dispatchEvent(new CustomEvent<LogoutBlocked>(EVENT, { detail: { pending: r.pending, proceed: doLogout } }));
      return false;
    }
  } catch {
    // check failed (offline, server error, client-portal user …) → go on
  }
  try {
    const ws: any = await utilityService.workStatus();
    if (ws?.session) {
      window.dispatchEvent(new CustomEvent<LogoutWorkRunning>(WORK_EVENT, { detail: { proceed: leave } }));
      return false;
    }
  } catch {
    // no work timer info → go on
  }
  await leave();
  return true;
}

export function onLogoutBlocked(fn: (d: LogoutBlocked) => void) {
  const h = (e: Event) => fn((e as CustomEvent<LogoutBlocked>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

export function onLogoutWorkRunning(fn: (d: LogoutWorkRunning) => void) {
  const h = (e: Event) => fn((e as CustomEvent<LogoutWorkRunning>).detail);
  window.addEventListener(WORK_EVENT, h);
  return () => window.removeEventListener(WORK_EVENT, h);
}
