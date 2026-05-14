import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/voicers/Topbar";
import { StatusBadge } from "@/components/voicers/StatusBadge";
import { AgentAvatar } from "@/components/voicers/AgentAvatar";
import { Button } from "@/components/ui/button";
import { Search, Upload, Phone, Headphones, Eye, Trash2, Filter } from "lucide-react";
import { agents, leads } from "@/data/mock";

export const Route = createFileRoute("/_app/leads")({
  component: LeadsPage,
  head: () => ({ meta: [{ title: "Leads — VoiceRS" }] }),
});

function LeadsPage() {
  return (
    <>
      <Topbar
        title="Central de leads"
        subtitle={`${leads.length} leads · ${leads.filter(l => l.status === "qualificado").length} qualificados`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5"><Upload className="h-4 w-4" /> Importar</Button>
            <Button className="gap-1.5"><Phone className="h-4 w-4" /> Ligar selecionados</Button>
          </div>
        }
      />
      <div className="space-y-4 p-8">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Buscar por nome ou telefone…" className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          </div>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option>Todas as campanhas</option>
            {Array.from(new Set(leads.map(l => l.campaignName))).map(n => <option key={n}>{n}</option>)}
          </select>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option>Todos os status</option>
            <option>Pendente</option><option>Qualificado</option><option>Recusado</option><option>Não atendeu</option>
          </select>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-3.5 w-3.5" /> Mais filtros</Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3"><input type="checkbox" className="accent-primary" /></th>
                  <th className="px-3 py-3 font-medium">Lead</th>
                  <th className="px-3 py-3 font-medium">Campanha</th>
                  <th className="px-3 py-3 font-medium">Agente</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Tent.</th>
                  <th className="px-3 py-3 font-medium">Última</th>
                  <th className="px-3 py-3 font-medium">Resumo</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const ag = agents.find(a => a.name === l.agentName);
                  return (
                    <tr key={l.id} className="border-b border-border/60 transition-colors hover:bg-background/40">
                      <td className="px-4 py-3"><input type="checkbox" className="accent-primary" /></td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{l.nome}</div>
                        <div className="font-mono text-xs text-muted-foreground">{l.telefone}</div>
                      </td>
                      <td className="px-3 py-3 max-w-[200px] truncate text-muted-foreground">{l.campaignName}</td>
                      <td className="px-3 py-3">{ag && <div className="flex items-center gap-2"><AgentAvatar name={ag.name} color={ag.avatarColor} size={22} /><span className="text-xs">{ag.name}</span></div>}</td>
                      <td className="px-3 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-3 py-3 font-mono text-xs">{l.attempts}/3</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{l.lastCallAt ? new Date(l.lastCallAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td className="px-3 py-3 max-w-[260px] truncate text-xs text-muted-foreground">{l.resumoIa ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-0.5">
                          <Button variant="ghost" size="icon" title="Ver detalhes"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Ligar agora"><Phone className="h-4 w-4 text-amber" /></Button>
                          <Button variant="ghost" size="icon" title="Ouvir gravação" disabled={!l.lastCallAt}><Headphones className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Remover"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>Exibindo {leads.length} de {leads.length}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled>Anterior</Button>
              <Button variant="outline" size="sm">Próximo</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
