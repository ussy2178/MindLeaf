import * as React from "react";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-stone-100 text-stone-700 border-transparent",
  secondary:
    "bg-stone-100 text-stone-700 border-transparent",
  outline:
    "bg-transparent text-stone-700 border-stone-300",
  destructive:
    "bg-red-100 text-red-800 border-transparent",
};

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={`inline-flex items-center rounded-md border-none px-1.5 py-0.5 text-[10px] font-semibold leading-tight shadow-none transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
export type { BadgeVariant };
