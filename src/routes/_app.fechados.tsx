import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Topbar } from "@/components/voicers/Topbar";
import { StatusBadge } from "@/components/voicers/StatusBadge";
import { Button } from "@/components/ui/button";
import { Search, Trophy, ChevronDown, ChevronRight } from "lucide-react";
import { listClosedQueue } from "@/lib/pipeline.functions";
import type { LeadStatus } from "@/types";

export const Route = createFileRoute("/_app/fechados")({
  component: FechadosPage,
  head: () => ({ meta: [{ title: "Fila de fechados — VoiceRS" }] }),
});

function FechadosPage() {
  const fetchQueue = useServerFn(listClosedQueue);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["closed-queue"],
    queryFn: () => fetchQueue(),
  });

  const groups = data?.groups ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      g.primary.nome.toLowerCase().includes(q) ||
      (g.phone ?? "").toLowerCase().includes(q),
    );
  }, [groups, search]);

  function toggle(phone: string) {
    const next = new Set(open);
    if (next.has(phone)) next.delete(phone); else next.add(phone);
    setOpen(next);
  }

  return (
    <>
      <Topbar
        title="Fila de fechados"
        subtitle={`${groups.length} contatos qualificados, agrupados por número`}
      />
      <div className="space-y-4 p-8">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone…"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-2 py-3" />
                <th className="px-3 py-3 font-medium">Ordem</th>
                <th className="px-3 py-3 font-medium">Contato</th>
                <th className="px-3 py-3 font-medium">Telefone</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Duplicatas</th>
                <th className="px-3 py-3 font-medium">Última ligação</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">Carregando…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  <Trophy className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
                  Nenhum lead fechado ainda. Eles aparecem aqui quando ficam "Qualificado" ou "Agendado".
                </td></tr>
              )}
              {filtered.map((g, idx) => {
                const phoneKey = (g.phone ?? "").replace(/\D/g, "");
                const isOpen = open.has(phoneKey);
                const dupCount = g.duplicates.length;
                return (
                  <>
                    <tr key={phoneKey} className="border-b border-border/60 transition-colors hover:bg-background/40">
                      <td className="px-2 py-3 text-center">
                        {dupCount > 0 ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle(phoneKey)}>
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">#{idx + 1}</td>
                      <td className="px-3 py-3 font-medium">{g.primary.nome}</td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{g.phone}</td>
                      <td className="px-3 py-3"><StatusBadge status={(g.primary.status as LeadStatus) ?? "qualificado"} /></td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {dupCount > 0 ? `+${dupCount} no mesmo número` : "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {g.primary.last_call_at
                          ? new Date(g.primary.last_call_at).toLocaleString("pt-BR")
                          : "—"}
                      </td>
                    </tr>
                    {isOpen && g.duplicates.map((d) => (
                      <tr key={d.id} className="border-b border-border/40 bg-background/30 text-xs">
                        <td />
                        <td className="px-3 py-2 text-muted-foreground">↳</td>
                        <td className="px-3 py-2">{d.nome}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{d.telefone}</td>
                        <td className="px-3 py-2"><StatusBadge status={(d.status as LeadStatus) ?? "qualificado"} /></td>
                        <td className="px-3 py-2 text-muted-foreground">—</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {d.last_call_at ? new Date(d.last_call_at).toLocaleString("pt-BR") : "—"}
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}