import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Topbar } from "@/components/voicers/Topbar";
import { StatusBadge } from "@/components/voicers/StatusBadge";
import { Button } from "@/components/ui/button";
import { Flame, Phone, RefreshCw } from "lucide-react";
import { listColdLeads } from "@/lib/pipeline.functions";
import { startOutboundCall } from "@/lib/calls.functions";
import type { LeadStatus } from "@/types";

export const Route = createFileRoute("/_app/reaquecimento")({
  component: ReaquecimentoPage,
  head: () => ({ meta: [{ title: "Reaquecimento — VoiceRS" }] }),
});

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("55")) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

function daysSince(iso: string | null): string {
  if (!iso) return "nunca";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  return `há ${d} dias`;
}

function ReaquecimentoPage() {
  const qc = useQueryClient();
  const fetchCold = useServerFn(listColdLeads);
  const callFn = useServerFn(startOutboundCall);
  const [days, setDays] = useState(3);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["cold-leads", days],
    queryFn: () => fetchCold({ data: { days } }),
  });

  const callMut = useMutation({
    mutationFn: (lead: { id: string; telefone: string }) =>
      callFn({ data: { to: normalizePhone(lead.telefone), leadId: lead.id } }),
    onSuccess: () => {
      toast.success("Ligação iniciada");
      qc.invalidateQueries({ queryKey: ["cold-leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leads = data?.leads ?? [];

  return (
    <>
      <Topbar
        title="Reaquecimento de leads"
        subtitle={`${leads.length} leads frios há ≥ ${days} dia(s) prontos para nova tentativa`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              <Flame className="h-4 w-4 text-amber" />
              <span className="text-muted-foreground">Resfriado há</span>
              <input
                type="number"
                min={0}
                max={365}
                value={days}
                onChange={(e) => setDays(Math.max(0, Number(e.target.value) || 0))}
                className="w-14 rounded-md border border-border bg-background px-2 py-1 text-center text-sm"
              />
              <span className="text-muted-foreground">dia(s)</span>
            </label>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={"h-3.5 w-3.5 " + (isFetching ? "animate-spin" : "")} /> Atualizar
            </Button>
            <Button
              className="gap-1.5"
              disabled={leads.length === 0 || callMut.isPending}
              onClick={() => leads.forEach((l) => callMut.mutate({ id: l.id, telefone: l.telefone }))}
            >
              <Phone className="h-4 w-4" /> Reaquecer todos ({leads.length})
            </Button>
          </div>
        }
      />
      <div className="space-y-4 p-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-3 py-3 font-medium">Último contato</th>
                  <th className="px-3 py-3 font-medium">Tentativas</th>
                  <th className="px-3 py-3 font-medium">Status atual</th>
                  <th className="px-3 py-3 font-medium">Resumo IA</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">Carregando…</td></tr>
                )}
                {!isLoading && leads.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    Nenhum lead frio para reaquecer agora. Ajuste o intervalo de dias acima.
                  </td></tr>
                )}
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 transition-colors hover:bg-background/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{l.nome}</div>
                      <div className="font-mono text-xs text-muted-foreground">{l.telefone}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{daysSince(l.last_call_at)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{l.attempts}</td>
                    <td className="px-3 py-3"><StatusBadge status={(l.status as LeadStatus) ?? "pendente"} /></td>
                    <td className="px-3 py-3 max-w-[320px] truncate text-xs text-muted-foreground">{l.resumo_ia ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={callMut.isPending}
                        onClick={() => callMut.mutate({ id: l.id, telefone: l.telefone })}
                      >
                        <Phone className="h-3.5 w-3.5 text-amber" /> Reaquecer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}