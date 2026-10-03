import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/hrms/lib/utils";
import { BUTTON_BASE, BUTTON_SIZES, normalizeButtonClassName } from "@/components/ui/button";

// Same app-wide sizing as the CRM Button; only the default colour differs
// (HRMS theme's --button-bg / --button-foreground).
const buttonVariants = cva(BUTTON_BASE, {
  variants: {
    variant: {
      default: "bg-[hsl(var(--button-bg))] text-[hsl(var(--button-foreground))] hover:opacity-90",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
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
