import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/voicers/Topbar";
import { StatusBadge } from "@/components/voicers/StatusBadge";
import { AgentAvatar } from "@/components/voicers/AgentAvatar";
import { Button } from "@/components/ui/button";
import { Plus, Megaphone, Play, Pause, Settings2, MoreVertical } from "lucide-react";
import { agents, campaigns } from "@/data/mock";

export const Route = createFileRoute("/_app/campanhas")({
  component: Campanhas,
  head: () => ({ meta: [{ title: "Campanhas — VoiceRS" }] }),
});

const tipoLabel: Record<string, string> = {
  qualificacao: "Qualificação",
  agendamento: "Agendamento",
  reengajamento: "Reengajamento",
  pesquisa: "Pesquisa",
};

function Campanhas() {
  return (
    <>
      <Topbar
        title="Campanhas"
        subtitle={`${campaigns.length} campanhas · ${campaigns.filter(c => c.status === "ativa").length} ativas`}
        actions={<Button className="gap-1.5"><Plus className="h-4 w-4" /> Nova campanha</Button>}
      />
      <div className="space-y-5 p-8">
        <div className="flex flex-wrap items-center gap-2">
          {["Todas", "Ativas", "Pausadas", "Rascunhos", "Concluídas"].map((t, i) => (
            <button key={t} className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${i === 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const ag = agents.find(a => a.id === c.agentId)!;
            const progresso = Math.round(((c.totalLeads - c.pendingLeads) / Math.max(1, c.totalLeads)) * 100) || 0;
            return (
              <div key={c.id} className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={c.status} kind="campaign" />
                      <span className="rounded border border-border bg-background px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{tipoLabel[c.type]}</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold leading-tight">{c.name}</h3>
                    {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                </div>

                <div className="my-4 flex items-center gap-2.5 rounded-xl border border-border bg-background/50 p-2.5">
                  <AgentAvatar name={ag.name} color={ag.avatarColor} size={32} />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Agente</p>
                    <p className="truncate text-sm font-medium">{ag.name} · <span className="text-muted-foreground">{ag.voiceName}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
                  <div>
                    <p className="font-mono text-lg font-semibold">{c.totalLeads}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-semibold text-cyan">{c.pendingLeads}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pendentes</p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-semibold text-success">{c.qualifiedLeads}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Qualif.</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-mono text-amber">{c.conversionRate.toFixed(1)}% conv.</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber to-cyan" style={{ width: `${progresso}%` }} />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {c.status === "ativa" ? (
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5"><Pause className="h-3.5 w-3.5" /> Pausar</Button>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5"><Play className="h-3.5 w-3.5" /> Ativar</Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            );
          })}

          <button className="group flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/30 p-6 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            <div className="mb-3 rounded-2xl border border-border bg-background p-4 transition-colors group-hover:border-primary group-hover:text-primary">
              <Megaphone className="h-6 w-6" />
            </div>
            <p className="font-display text-base font-semibold">Nova campanha</p>
            <p className="mt-1 text-xs">Configure agente, prompt e leads em 3 etapas</p>
          </button>
        </div>
      </div>
    </>
  );
}
