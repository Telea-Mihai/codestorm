import * as React from "react";

import { cn } from "@/lib/utils";

type GlowButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode;
};

export default function GlowButton({
  className,
  icon,
  children,
  type = "button",
  ...props
}: GlowButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_8px_24px_rgba(34,211,238,0.18)] transition hover:bg-cyan-500/20 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_10px_28px_rgba(34,211,238,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
