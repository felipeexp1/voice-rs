import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/voicers/Topbar";
import { AgentAvatar } from "@/components/voicers/AgentAvatar";
import { Waveform } from "@/components/voicers/Waveform";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, UserCheck, Headphones, Pause, Play, GripVertical, X, Clock } from "lucide-react";
import { activeCalls, leads } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/monitor")({
  component: Monitor,
  head: () => ({ meta: [{ title: "Monitor de chamadas — VoiceRS" }] }),
});

function fmt(s: number) {
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

function Monitor() {
  const fila = leads.filter(l => l.status === "pendente").slice(0, 10);

  return (
    <>
      <Topbar
        title="Monitor ao vivo"
        subtitle="Acompanhe e intervenha nas chamadas em tempo real"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5"><Pause className="h-4 w-4" /> Pausar fila</Button>
            <Button className="gap-1.5"><Phone className="h-4 w-4" /> Ligar próximo</Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 p-8 xl:grid-cols-[1fr_340px]">
        {/* Active calls grid */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCell label="Chamadas ativas" value={activeCalls.length} accent="amber" pulse />
            <StatCell label="Na fila" value={fila.length} accent="cyan" />
            <StatCell label="Processadas hoje" value={1284} />
            <StatCell label="Taxa sucesso hoje" value="38%" accent="success" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeCalls.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border bg-background/40 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-destructive text-destructive" />
                    <span className="font-semibold uppercase tracking-wider text-destructive">Ao vivo</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-mono text-foreground">{fmt(c.durationSeconds)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AgentAvatar name={c.agentName} color={c.agentColor} size={24} />
                    <span className="text-xs font-medium">{c.agentName}</span>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div>
                    <p className="font-display text-lg font-semibold">{c.leadName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{c.leadPhone} · {c.campaignName.split("—")[0]}</p>
                  </div>

                  {/* Waveform reflecting who is speaking */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3">
                    <span className="text-xs font-medium" style={{ color: c.speaking === "agent" ? c.agentColor : "#06B6D4" }}>
                      {c.speaking === "agent" ? c.agentName : c.leadName} falando
                    </span>
                    <Waveform color={c.speaking === "agent" ? c.agentColor : "#06B6D4"} bars={28} height={26} />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="rounded-lg border border-amber/20 bg-amber/5 p-3">
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-amber">🤖 {c.agentName}</p>
                      <p className="text-foreground/90">{c.lastAgent}</p>
                    </div>
                    <div className="rounded-lg border border-cyan/20 bg-cyan/5 p-3">
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-cyan">👤 {c.leadName}</p>
                      <p className="text-foreground/90">{c.lastLead}</p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Sentimento</span>
                      <span className="font-mono text-foreground">{c.sentiment}%</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-destructive via-warning to-success" style={{ width: "100%", opacity: 0.25 }} />
                      <div className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-foreground shadow" style={{ left: `calc(${c.sentiment}% - 2px)` }} />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5"><Headphones className="h-3.5 w-3.5" /> Ouvir</Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Assumir</Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive"><PhoneOff className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Queue */}
        <aside className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="font-display text-base font-semibold">Fila de espera</h3>
              <p className="text-xs text-muted-foreground">Próximas {fila.length} ligações</p>
            </div>
            <Button variant="ghost" size="icon"><Play className="h-4 w-4" /></Button>
          </div>
          <ul className="divide-y divide-border">
            {fila.map((l, idx) => (
              <li key={l.id} className="flex items-center gap-2 px-3 py-3 transition-colors hover:bg-background/40">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">#{String(idx+1).padStart(2,"0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.nome}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {l.nextAttemptAt ? new Date(l.nextAttemptAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7"><X className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}

function StatCell({ label, value, accent = "default", pulse }: { label: string; value: React.ReactNode; accent?: "default" | "amber" | "cyan" | "success"; pulse?: boolean }) {
  const c = { default: "text-foreground", amber: "text-amber", cyan: "text-cyan", success: "text-success" }[accent];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-semibold tabular-nums", c)}>
        {value}
        {pulse && <span className="pulse-dot ml-2 inline-block h-2 w-2 rounded-full align-middle bg-amber text-amber" />}
      </p>
    </div>
  );
}
