import { Link } from "react-router-dom";
import { usePermissionContext } from "@/context/PermissionContext";
import { getLandingPath } from "@/lib/landingPath";

export function AlreadyLoggedInBanner() {
  const { user, permissions, isStaff, logout } = usePermissionContext();
  if (!user) return null;

  const dashboardPath = getLandingPath(user, permissions, isStaff);

  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">
        Logged in as{" "}
        <span className="font-medium text-foreground">
          {user.firstname} {user.lastname}
        </span>
      </span>
      <div className="flex items-center gap-3 shrink-0">
        <Link to={dashboardPath} className="font-medium text-primary hover:underline">
          Go to dashboard
        </Link>
        <button
          type="button"
          onClick={() => logout()}
          className="font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
