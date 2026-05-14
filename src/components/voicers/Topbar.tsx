import { Plus, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "./AgentAvatar";

export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-4 px-8 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="truncate font-display text-2xl font-semibold">{title}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-success" /> Sistema online
            </span>
          </div>
          {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar leads, campanhas…  ⌘K"
              className="w-72 rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </Button>
          {actions ?? (
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova Campanha
            </Button>
          )}
          <AgentAvatar name="Operador" color="#1E1E2E" />
        </div>
      </div>
    </header>
  );
}
