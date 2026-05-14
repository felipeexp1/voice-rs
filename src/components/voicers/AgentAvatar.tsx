import { cn } from "@/lib/utils";

export function AgentAvatar({ name, color, size = 36, ring = false }: { name: string; color: string; size?: number; ring?: boolean }) {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div
      className={cn("inline-flex items-center justify-center rounded-full font-display font-semibold text-background shadow-inner", ring && "ring-2 ring-offset-2 ring-offset-background")}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.42 }}
      aria-label={name}
    >
      {initial}
    </div>
  );
}
