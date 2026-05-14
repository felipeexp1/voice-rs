import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label, value, delta, icon, accent = "amber", spark, footer,
}: {
  label: string; value: ReactNode; delta?: string; icon?: ReactNode;
  accent?: "amber" | "cyan" | "success" | "destructive";
  spark?: ReactNode; footer?: ReactNode;
}) {
  const accentClass = {
    amber: "text-amber",
    cyan: "text-cyan",
    success: "text-success",
    destructive: "text-destructive",
  }[accent];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(245,158,11,0.18)]">
      <div className={cn("absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30", accentClass)}
           style={{ background: "currentColor" }} />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-3xl font-semibold tabular-nums">{value}</p>
          {delta && <p className={cn("text-xs font-medium", accentClass)}>{delta}</p>}
        </div>
        {icon && <div className={cn("rounded-xl border border-border bg-background/60 p-2.5", accentClass)}>{icon}</div>}
      </div>
      {spark && <div className="relative mt-4 h-12">{spark}</div>}
      {footer && <div className="relative mt-3 text-xs text-muted-foreground">{footer}</div>}
    </div>
  );
}
