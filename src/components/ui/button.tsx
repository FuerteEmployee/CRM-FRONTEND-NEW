import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// App-wide button sizing. Every <Button> (CRM + HRMS) gets its height,
// padding, font size/weight and corner radius from here — per-page overrides
// of those are dropped by normalizeButtonClassName so all buttons stay
// uniform. Pages keep control of colour, width (w-full…), shadows, icons.
export const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0";

export const BUTTON_SIZES = {
  default: "h-8 px-3 text-[12.5px]",
  sm: "h-7 px-2.5 text-xs",
  lg: "h-9 px-4 text-[13px]",
  icon: "h-8 w-8 [&_svg]:size-4",
} as const;

// Utility (without variant prefixes like `md:`/`hover:`/`!`) that a page may
// not override on a Button.
const SIZE_UTILITY = /^(h-(\d|\[)|p[xy]?-(?!0$)|text-(xs|sm|base|lg|xl|\dxl|\[\d)|font-(black|extrabold|bold|semibold|medium|normal)$|uppercase$|tracking-|leading-|gap-|rounded(-(sm|md|lg|xl|2xl|3xl))?$)/;
const ICON_WIDTH_UTILITY = /^w-(\d|\[)/;

const utilityOf = (token: string) => token.replace(/^(?:\[[^\]]*\]:|[^:[\]]+:)*/, "").replace(/^!/, "");

/**
 * Removes size/typography overrides from a Button's className so the
 * component's sizing always applies. Link-style buttons and custom
 * layouts (className with `h-auto`) keep their own sizing.
 */
export function normalizeButtonClassName(
  className: string | undefined,
  opts: { variant?: string | null; size?: string | null; asIs?: boolean } = {},
) {
  if (!className || opts.asIs) return className;
  if (opts.variant === "link") return className;
  const tokens = className.split(/\s+/).filter(Boolean);
  if (tokens.some((t) => utilityOf(t) === "h-auto")) return className;

  // Square icon buttons sized by classes only (e.g. "h-10 w-10" without
  // size="icon") stay square at the standard icon size.
  const baseSize = (prefix: "h" | "w") =>
    tokens.find((t) => t.startsWith(`${prefix}-`) && /^[hw]-(\d+(\.\d+)?|\[[^\]]+\])$/.test(t))?.slice(2);
  const squareLike = opts.size !== "icon" && !!baseSize("h") && baseSize("h") === baseSize("w");
  const isIcon = opts.size === "icon" || squareLike;

  const kept = tokens.filter((t) => {
    const u = utilityOf(t);
    if (SIZE_UTILITY.test(u)) return false;
    if (isIcon && ICON_WIDTH_UTILITY.test(u)) return false;
    return true;
  });
  if (squareLike) kept.push(opts.size === "sm" ? "w-7 px-0" : opts.size === "lg" ? "w-9 px-0" : "w-8 px-0");
  return kept.join(" ");
}

const buttonVariants = cva(BUTTON_BASE, {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm shadow-destructive/20",
      success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm shadow-success/20",
      info: "bg-info text-info-foreground hover:bg-info/90 shadow-sm shadow-info/20",
      warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm shadow-warning/20",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: BUTTON_SIZES,
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Opt out of the uniform sizing and use className exactly as given. */
  asIs?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, asIs = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const cls = normalizeButtonClassName(className, { variant, size, asIs });
    return <Comp className={cn(buttonVariants({ variant, size, className: cls }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
