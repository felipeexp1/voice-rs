import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Topbar } from "@/components/voicers/Topbar";
import { AgentAvatar } from "@/components/voicers/AgentAvatar";
import { Waveform } from "@/components/voicers/Waveform";
import { Button } from "@/components/ui/button";
import { Play, Pencil, Power, Phone, Cpu, Thermometer } from "lucide-react";
import { agents as allAgents } from "@/data/mock";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_app/agentes")({
  component: Agentes,
  head: () => ({ meta: [{ title: "Agentes — VoiceRS" }] }),
});

function Agentes() {
  const navigate = useNavigate();
  // Mostra apenas a Sofia. Quando quisermos suportar mais agentes, removemos esse filtro.
  const agents = allAgents.filter((a) => a.name === "Sofia");
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(agents.map((a) => [a.id, true])),
  );

  const goTest = () => navigate({ to: "/testar-agente" });
  const goEdit = () => navigate({ to: "/configuracoes" });
  const toggleActive = (id: string, name: string) => {
    setActiveMap((m) => {
      const next = { ...m, [id]: !m[id] };
      toast.success(`${name} ${next[id] ? "ativado" : "desativado"}.`);
      return next;
    });
  };

  return (
    <>
      <Topbar
        title="Agentes de voz"
        subtitle={`${Object.values(activeMap).filter(Boolean).length} ativos · ${agents.length} no total`}
      />
      <div className="grid grid-cols-1 gap-4 p-8 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => {
          const isActive = activeMap[a.id];
          return (
          <div key={a.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl" style={{ background: a.avatarColor }} />

            <div className="relative flex items-start gap-4">
              <AgentAvatar name={a.name} color={a.avatarColor} size={56} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl font-semibold">{a.name}</h3>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                      <span className="pulse-dot h-1 w-1 rounded-full bg-success" /> Ativo
                    </span>
                  ) : (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Inativo</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{a.voiceName} · {a.voiceProvider}</p>
              </div>
            </div>

            <p className="relative mt-4 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>

            <div className="relative mt-5 grid grid-cols-3 gap-2 rounded-xl border border-border bg-background/50 p-3 text-center">
              <div>
                <p className="font-mono text-base font-semibold">{a.totalCalls}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ligações</p>
              </div>
              <div>
                <p className="font-mono text-base font-semibold text-amber">{a.conversionRate?.toFixed(1)}%</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversão</p>
              </div>
              <div>
                <p className="font-mono text-base font-semibold">{a.avgDuration}s</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dur. média</p>
              </div>
            </div>

            <div className="relative mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" /> {a.model}</span>
              <span className="inline-flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5" /> {a.temperature}</span>
              <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {a.telephonyProvider}</span>
            </div>

            <div className="relative mt-5 flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" style={{ color: a.avatarColor, borderColor: `${a.avatarColor}40` }} onClick={goTest}>
                <Play className="h-3.5 w-3.5" /> Testar voz
                <Waveform color={a.avatarColor} bars={5} height={14} />
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={goEdit}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`ml-auto ${isActive ? "text-success" : "text-muted-foreground"}`}
                onClick={() => toggleActive(a.id, a.name)}
                aria-label={isActive ? "Desativar agente" : "Ativar agente"}
              >
                <Power className="h-4 w-4" />
              </Button>
            </div>
          </div>
          );
        })}
      </div>
    </>
  );
}
