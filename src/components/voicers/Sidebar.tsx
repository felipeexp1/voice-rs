import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Megaphone, Bot, Users, Headphones, BarChart3, Settings, ChevronLeft, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { activeCalls } from "@/data/mock";
import { isAdmin } from "@/lib/users.functions";
import logoRS from "@/assets/logo-rocha-silva.png";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true as boolean, badge: undefined as number | undefined },
  { to: "/campanhas", label: "Campanhas", icon: Megaphone, exact: false, badge: undefined as number | undefined },
  { to: "/agentes", label: "Agentes", icon: Bot, exact: false, badge: undefined as number | undefined },
  { to: "/leads", label: "Leads", icon: Users, exact: false, badge: undefined as number | undefined },
  { to: "/monitor", label: "Monitor", icon: Headphones, exact: false, badge: activeCalls.length as number | undefined },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, exact: false, badge: undefined as number | undefined },
  { to: "/configuracoes", label: "Configurações", icon: Settings, exact: false, badge: undefined as number | undefined },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [admin, setAdmin] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const checkAdmin = useServerFn(isAdmin);

  useEffect(() => {
    checkAdmin().then((r) => setAdmin(r.admin)).catch(() => setAdmin(false));
  }, [checkAdmin]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-5">
        <img src={logoRS} alt="Rocha & Silva" className="h-10 w-10 shrink-0 rounded-xl object-contain" />
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-bold tracking-tight">Rocha &amp; Silva</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Call Center IA</span>
          </div>
        )}
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 px-2">
        {items.map(({ to, label, icon: Icon, badge, exact }) => {
          const active = exact ? path === to : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-primary" />}
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && badge ? (
                <span className="pulse-dot ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        {admin && (
          <Link
            to="/usuarios"
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              path.startsWith("/usuarios")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            {path.startsWith("/usuarios") && <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-primary" />}
            <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="flex-1">Usuários</span>}
          </Link>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleLogout}
          className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Sair"}
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Recolher"}
        </button>
      </div>
    </aside>
  );
}
