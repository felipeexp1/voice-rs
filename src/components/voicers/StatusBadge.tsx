import type { LeadStatus, CampaignStatus } from "@/types";
import { cn } from "@/lib/utils";

const leadMap: Record<LeadStatus, { label: string; className: string; dot?: boolean }> = {
  pendente:               { label: "Pendente",         className: "bg-muted text-muted-foreground border-border" },
  ligando:                { label: "Ligando",          className: "bg-amber/15 text-amber border-amber/30", dot: true },
  qualificado:            { label: "Qualificado",      className: "bg-success/15 text-success border-success/30" },
  recusado:               { label: "Recusado",         className: "bg-destructive/15 text-destructive border-destructive/30" },
  nao_atendeu:            { label: "Não atendeu",      className: "bg-muted text-muted-foreground border-border" },
  caixa_postal:           { label: "Caixa postal",     className: "bg-muted text-muted-foreground border-border" },
  necessita_especialista: { label: "Especialista",     className: "bg-warning/15 text-warning border-warning/30" },
  agendado:               { label: "Agendado",         className: "bg-cyan/15 text-cyan border-cyan/30" },
  pessoa_errada:          { label: "Pessoa errada",    className: "bg-muted text-muted-foreground border-border" },
  erro:                   { label: "Erro",             className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const campMap: Record<CampaignStatus, { label: string; className: string; dot?: boolean }> = {
  rascunho:  { label: "Rascunho",  className: "bg-muted text-muted-foreground border-border" },
  ativa:     { label: "Ativa",     className: "bg-success/15 text-success border-success/30", dot: true },
  pausada:   { label: "Pausada",   className: "bg-warning/15 text-warning border-warning/30" },
  concluida: { label: "Concluída", className: "bg-cyan/15 text-cyan border-cyan/30" },
};

export function StatusBadge({ status, kind = "lead" }: { status: string; kind?: "lead" | "campaign" }) {
  const cfg = kind === "campaign" ? campMap[status as CampaignStatus] : leadMap[status as LeadStatus];
  if (!cfg) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.className)}>
      {cfg.dot && <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full" style={{ color: "currentColor", backgroundColor: "currentColor" }} />}
      {cfg.label}
    </span>
  );
}
