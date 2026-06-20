import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-none border-2 px-5 text-sm font-bold uppercase tracking-[0.08em] transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-[var(--accent-foreground)] border-[var(--accent)] hover:bg-[#c4ef2a] hover:border-[#c4ef2a] hover:shadow-[0_0_20px_var(--accent-glow)]",
        secondary:
          "bg-[var(--surface-2)] text-[var(--foreground)] border-[var(--border-bright)] hover:bg-[var(--surface-3)] hover:border-[var(--foreground)]",
        ghost:
          "bg-transparent text-[var(--foreground-muted)] border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
        danger:
          "bg-[var(--status-live)] text-white border-[var(--status-live)] hover:bg-[#e12424] hover:border-[#e12424]"
      },
      size: {
        default: "h-10 px-5 text-sm",
        icon: "h-10 w-10 px-0",
        sm: "h-8 px-3 text-xs"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
