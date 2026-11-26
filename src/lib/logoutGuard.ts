// "Finish today's tasks before you log out."
// Every Logout button calls guardedLogout(). The server says whether the person
// still has tasks due today (or overdue) that are not Complete; if so the
// logout does not happen, the popup (components/layout/PendingTasksLogoutDialog)
// lists those tasks, and the company admins get a notification. Admins are
// never blocked. If the check itself fails, the logout goes ahead — nobody is
// ever trapped in the app by a server error.
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

const EVENT = "crm:logout-blocked";

/** Logs out unless tasks are pending. Returns true when it logged out. */
export async function guardedLogout(doLogout: () => Promise<void> | void): Promise<boolean> {
  try {
    const r: any = await utilityService.logoutCheck(true);
    if (r?.blocked && Array.isArray(r.pending) && r.pending.length) {
      window.dispatchEvent(new CustomEvent<LogoutBlocked>(EVENT, { detail: { pending: r.pending, proceed: doLogout } }));
      return false;
    }
  } catch {
    // check failed (offline, server error, client-portal user …) → log out normally
  }
  await doLogout();
  return true;
}

export function onLogoutBlocked(fn: (d: LogoutBlocked) => void) {
  const h = (e: Event) => fn((e as CustomEvent<LogoutBlocked>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}
