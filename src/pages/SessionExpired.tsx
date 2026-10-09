import { useSearchParams } from "react-router-dom";
import { Ban, LockKeyhole } from "lucide-react";

const ALLOWED_LOGINS = ["/admin/login", "/staff/login", "/super-admin/login", "/client/login"];

const SessionExpired = () => {
  const [params] = useSearchParams();
  const requested = params.get("login") || "";
  const loginPath = ALLOWED_LOGINS.includes(requested) ? requested : "/admin/login";
  // Set by lib/session.ts when the backend says the whole company is blocked.
  const reason = params.get("reason");

  if (reason === "suspended" || reason === "company_missing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <Ban className="h-7 w-7 text-destructive" />
          </div>
          <p className="mb-2 text-xl font-semibold">
            {reason === "suspended" ? "Account suspended" : "Account not available"}
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            {reason === "suspended"
              ? "Your company's account has been suspended. Please contact support to re-activate it."
              : "Your company's account no longer exists. Please contact support."}
          </p>
          <a
            href={loginPath}
            className="inline-flex w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <LockKeyhole className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="mb-1 text-3xl font-bold">401</h1>
        <p className="mb-2 text-xl font-semibold">Session expired</p>
        <p className="mb-6 text-sm text-muted-foreground">
          For your security you were signed out. Please log in again to continue.
        </p>
        <a
          href={loginPath}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Log in again
        </a>
      </div>
    </div>
  );
};

export default SessionExpired;
