import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, PhoneOutgoing, PhoneIncoming, Loader2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Topbar } from "@/components/voicers/Topbar";
import { Button } from "@/components/ui/button";
import { listCalls, startOutboundCall } from "@/lib/calls.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/chamadas")({
  component: ChamadasPage,
  head: () => ({ meta: [{ title: "Chamadas — VoiceRS" }] }),
});

type Call = {
  id: string;
  twilio_call_sid: string | null;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript: Array<{ role: string; text: string }> | null;
  recording_url: string | null;
  created_at: string;
};

function statusColor(s: string): string {
  if (s === "completed" || s === "answered") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (s === "in-progress" || s === "ringing") return "bg-cyan/15 text-cyan border-cyan/30";
  if (s === "failed" || s === "busy" || s === "no-answer" || s === "canceled") return "bg-red-500/15 text-red-400 border-red-500/30";
  return "bg-secondary text-muted-foreground border-border";
}

function fmtDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function ChamadasPage() {
  const fetchCalls = useServerFn(listCalls);
  const dialOut = useServerFn(startOutboundCall);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["calls"],
    queryFn: () => fetchCalls(),
    refetchInterval: 5000,
  });
  const calls = (data?.calls ?? []) as Call[];

  const [to, setTo] = useState("");
  const [dialing, setDialing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleDial(e: React.FormEvent) {
    e.preventDefault();
    if (!to.match(/^\+[1-9]\d{6,14}$/)) {
      toast.error("Use formato E.164, ex: +5511999999999");
      return;
    }
    setDialing(true);
    try {
      const r = await dialOut({ data: { to } });
      toast.success(`Discando para ${to}…`);
      setTo("");
      qc.invalidateQueries({ queryKey: ["calls"] });
      void r;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDialing(false);
    }
  }

  return (
    <>
      <Topbar
        title="Chamadas"
        subtitle={`${calls.length} chamadas registradas · atualiza a cada 5s`}
      />
      <div className="space-y-6 p-8">
        {/* Discador outbound */}
        <form
          onSubmit={handleDial}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-5"
        >
          <div className="min-w-[260px] flex-1">
            <label className="mb-1.5 block text-sm font-medium">Discar para um número</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="+5511999999999"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Formato E.164 — código do país obrigatório</p>
          </div>
          <Button type="submit" disabled={dialing} className="gap-1.5">
            {dialing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOutgoing className="h-4 w-4" />}
            {dialing ? "Discando…" : "Ligar agora"}
          </Button>
        </form>

        {/* Lista */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando chamadas…
            </div>
          ) : calls.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Nenhuma chamada ainda. Use o discador acima ou aguarde uma ligação inbound.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {calls.map((c) => {
                const isOpen = expanded === c.id;
                const Icon = c.direction === "inbound" ? PhoneIncoming : PhoneOutgoing;
                return (
                  <div key={c.id}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                      className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-background/40"
                    >
                      <div className={cn(
                        "grid h-10 w-10 place-items-center rounded-xl border",
                        c.direction === "inbound" ? "border-cyan/30 bg-cyan/10 text-cyan" : "border-amber/30 bg-amber/10 text-amber",
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-medium">
                            {c.direction === "inbound" ? c.from_number : c.to_number}
                          </span>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusColor(c.status))}>
                            {c.status}
                          </span>
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">
                            {c.direction === "inbound" ? "recebida" : "feita"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtTime(c.started_at ?? c.created_at)}</span>
                          <span>Duração: {fmtDuration(c.duration_seconds)}</span>
                          {c.transcript && c.transcript.length > 0 && <span>{c.transcript.length} mensagens</span>}
                        </div>
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <div className="space-y-3 border-t border-border bg-background/30 p-5">
                        {c.transcript && c.transcript.length > 0 ? (
                          <div className="space-y-2">
                            {c.transcript.map((m, i) => (
                              <div key={i} className={cn("flex", m.role === "assistant" ? "justify-start" : "justify-end")}>
                                <div className={cn(
                                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                                  m.role === "assistant" ? "bg-secondary text-foreground" : "bg-primary/15 text-foreground",
                                )}>
                                  <div className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{m.role === "assistant" ? "agente" : "cliente"}</div>
                                  {m.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sem transcrição disponível.</p>
                        )}
                        {c.recording_url && (
                          <audio controls src={c.recording_url + ".mp3"} className="w-full" />
                        )}
                        {c.twilio_call_sid && (
                          <p className="font-mono text-[10px] text-muted-foreground">SID: {c.twilio_call_sid}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
