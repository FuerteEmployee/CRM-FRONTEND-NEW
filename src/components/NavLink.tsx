import { NavLink as RouterNavLink, NavLinkProps, useLocation } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    const location = useLocation();

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive: routerIsActive, isPending }) => {
          let isActive = routerIsActive;
          if (typeof to === "string" && to.includes("?")) {
            const [toPath, toQuery] = to.split("?");
            const toParams = new URLSearchParams(toQuery);
            const currentParams = new URLSearchParams(location.search);
            const queryMatches = Array.from(toParams.entries()).every(
              ([key, val]) => currentParams.get(key) === val
            );
            isActive = routerIsActive && location.pathname === toPath && queryMatches;
          }
          return cn(className, isActive && activeClassName, isPending && pendingClassName);
        }}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
