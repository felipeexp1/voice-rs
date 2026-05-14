import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Topbar } from "@/components/voicers/Topbar";
import { StatusBadge } from "@/components/voicers/StatusBadge";
import { Button } from "@/components/ui/button";
import { Search, Upload, Phone, Trash2, Filter } from "lucide-react";
import { listLeads, importLeads, deleteLead, deleteAllLeads } from "@/lib/leads.functions";
import { startOutboundCall } from "@/lib/calls.functions";
import type { LeadStatus } from "@/types";

export const Route = createFileRoute("/_app/leads")({
  component: LeadsPage,
  head: () => ({ meta: [{ title: "Leads — VoiceRS" }] }),
});

type LeadRow = {
  id: string;
  nome: string;
  telefone: string;
  numero_processo: string | null;
  polo_ativo: string | null;
  valor_causa: number | null;
  classe_processo: string | null;
  status: string;
  attempts: number;
  last_call_at: string | null;
  resumo_ia: string | null;
};

function pick(row: Record<string, string>, candidates: string[]): string {
  for (const c of candidates) {
    for (const k of Object.keys(row)) {
      if (k.trim().toLowerCase() === c.toLowerCase()) return (row[k] ?? "").trim();
    }
  }
  return "";
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === sep && !inQ) {
        out.push(cur); cur = "";
      } else { cur += ch; }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = splitLine(lines[0]);
  return lines.slice(1).map((l) => {
    const cols = splitLine(l);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("55")) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

function parseValor(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[R$\s.]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function LeadsPage() {
  const qc = useQueryClient();
  const fetchLeads = useServerFn(listLeads);
  const importFn = useServerFn(importLeads);
  const deleteFn = useServerFn(deleteLead);
  const deleteAllFn = useServerFn(deleteAllLeads);
  const callFn = useServerFn(startOutboundCall);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => fetchLeads(),
  });
  const leads: LeadRow[] = (data?.leads ?? []) as LeadRow[];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.nome.toLowerCase().includes(q) ||
        l.telefone.toLowerCase().includes(q) ||
        (l.numero_processo ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, search, statusFilter]);

  type LeadInputRow = {
    nome: string;
    telefone: string;
    numero_processo: string | null;
    polo_ativo: string | null;
    valor_causa: number | null;
    classe_processo: string | null;
  };
  const importMut = useMutation({
    mutationFn: (rows: LeadInputRow[]) =>
      importFn({ data: { leads: rows } }),
    onSuccess: (res) => {
      toast.success(`${res.inserted} leads importados`);
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAllMut = useMutation({
    mutationFn: () => deleteAllFn(),
    onSuccess: () => {
      toast.success("Lista limpa");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const callMut = useMutation({
    mutationFn: (lead: LeadRow) =>
      callFn({ data: { to: normalizePhone(lead.telefone), leadId: lead.id } }),
    onSuccess: () => toast.success("Ligação iniciada"),
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) { toast.error("CSV vazio ou inválido"); return; }
      const parsed = rows.map((r) => {
        const nome = pick(r, ["nome", "name"]);
        const tel = normalizePhone(pick(r, ["telefone", "phone", "celular"]));
        return {
          nome,
          telefone: tel,
          numero_processo: pick(r, ["numero_processo", "número do processo", "numero do processo", "processo", "cnj"]) || null,
          polo_ativo: pick(r, ["polo_ativo", "polo ativo", "autor"]) || null,
          valor_causa: parseValor(pick(r, ["valor_causa", "valor da causa", "valor"])),
          classe_processo: pick(r, ["classe_processo", "classe do processo", "classe"]) || null,
        };
      }).filter((l) => l.nome && l.telefone);
      if (parsed.length === 0) {
        toast.error("Nenhuma linha válida (precisa de nome + telefone)");
        return;
      }
      importMut.mutate(parsed);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function downloadTemplate() {
    const csv = "nome,telefone,numero_processo,polo_ativo,valor_causa,classe_processo\nMaria Silva,+5511999999999,0001234-56.2024.8.26.0100,Maria Silva,15000.00,Procedimento Comum Cível\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modelo-leads.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function callSelected() {
    const items = filtered.filter((l) => selected.has(l.id));
    if (items.length === 0) { toast.error("Selecione ao menos um lead"); return; }
    items.forEach((l) => callMut.mutate(l));
    setSelected(new Set());
  }

  return (
    <>
      <Topbar
        title="Central de leads"
        subtitle={`${leads.length} leads · ${leads.filter((l) => l.status === "qualificado").length} qualificados`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>Modelo CSV</Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={importMut.isPending}>
              <Upload className="h-4 w-4" /> {importMut.isPending ? "Importando…" : "Importar CSV"}
            </Button>
            <Button className="gap-1.5" onClick={callSelected} disabled={selected.size === 0}>
              <Phone className="h-4 w-4" /> Ligar selecionados ({selected.size})
            </Button>
            {leads.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => {
                if (confirm("Apagar todos os leads?")) deleteAllMut.mutate();
              }}>
                <Trash2 className="h-3.5 w-3.5" /> Limpar tudo
              </Button>
            )}
          </div>
        }
      />
      <div className="space-y-4 p-8">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone ou nº do processo…"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="ligando">Ligando</option>
            <option value="qualificado">Qualificado</option>
            <option value="recusado">Recusado</option>
            <option value="nao_atendeu">Não atendeu</option>
          </select>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-3.5 w-3.5" /> Mais filtros</Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={filtered.length > 0 && filtered.every((l) => selected.has(l.id))}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) filtered.forEach((l) => next.add(l.id));
                        else filtered.forEach((l) => next.delete(l.id));
                        setSelected(next);
                      }}
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">Lead</th>
                  <th className="px-3 py-3 font-medium">Nº processo</th>
                  <th className="px-3 py-3 font-medium">Polo ativo</th>
                  <th className="px-3 py-3 font-medium">Valor causa</th>
                  <th className="px-3 py-3 font-medium">Classe</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Tent.</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">Carregando…</td></tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    Nenhum lead. Use <strong>Importar CSV</strong> para subir sua lista.
                  </td></tr>
                )}
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 transition-colors hover:bg-background/40">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={selected.has(l.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(l.id); else next.delete(l.id);
                          setSelected(next);
                        }}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{l.nome}</div>
                      <div className="font-mono text-xs text-muted-foreground">{l.telefone}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{l.numero_processo ?? "—"}</td>
                    <td className="px-3 py-3 max-w-[200px] truncate text-xs text-muted-foreground">{l.polo_ativo ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {l.valor_causa != null
                        ? Number(l.valor_causa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </td>
                    <td className="px-3 py-3 max-w-[180px] truncate text-xs text-muted-foreground">{l.classe_processo ?? "—"}</td>
                    <td className="px-3 py-3"><StatusBadge status={(l.status as LeadStatus) ?? "pendente"} /></td>
                    <td className="px-3 py-3 font-mono text-xs">{l.attempts}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ligar agora"
                          disabled={callMut.isPending}
                          onClick={() => callMut.mutate(l)}
                        >
                          <Phone className="h-4 w-4 text-amber" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Remover"
                          onClick={() => deleteMut.mutate(l.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>Exibindo {filtered.length} de {leads.length}</span>
          </div>
        </div>
      </div>
    </>
  );
}
