import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: LucideIcon;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon: Icon, ...props }, ref) => {
    return (
      <label className="relative block">
        {Icon ? (
          <Icon
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "15px",
              height: "15px",
              color: "var(--foreground-muted)",
              pointerEvents: "none"
            }}
          />
        ) : null}
        <input
          ref={ref}
          className={cn("focus-ring", className)}
          style={{
            height: "44px",
            width: "100%",
            borderRadius: "0",
            border: "1px solid var(--border-bright)",
            background: "var(--surface-1)",
            padding: Icon ? "0 14px 0 40px" : "0 14px",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--foreground)",
            outline: "none",
            letterSpacing: "-0.01em",
            transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease"
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
            (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px var(--accent)";
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-bright)";
            (e.currentTarget as HTMLElement).style.background = "var(--surface-1)";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
            props.onBlur?.(e);
          }}
          {...props}
        />
      </label>
    );
  }
);
Input.displayName = "Input";
