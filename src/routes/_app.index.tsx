import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/voicers/Topbar";
import { MetricCard } from "@/components/voicers/MetricCard";
import { StatusBadge } from "@/components/voicers/StatusBadge";
import { AgentAvatar } from "@/components/voicers/AgentAvatar";
import { Waveform } from "@/components/voicers/Waveform";
import { agents, campaigns, leads, callsByHour, activeCalls } from "@/data/mock";
import { Phone, Target, CheckCircle2, Radio, Play } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Line,
} from "recharts";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — VoiceRS" }] }),
});

function Sparkline({ color }: { color: string }) {
  const data = Array.from({ length: 16 }).map((_, i) => ({ v: 30 + Math.sin(i / 1.6) * 18 + (i * 7) % 9 }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area dataKey="v" stroke={color} strokeWidth={2} fill={`url(#spark-${color})`} type="monotone" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Dashboard() {
  const totalLigacoes = 1284;
  const taxa = 38;
  const qualificados = 412;
  const ativas = activeCalls.length;
  const recentes = leads.slice(0, 8);

  return (
    <>
      <Topbar title="Dashboard" subtitle="Visão geral da operação em tempo real" />
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Ligações hoje" value={totalLigacoes.toLocaleString("pt-BR")} delta="+12.4% vs ontem" icon={<Phone className="h-4 w-4" />} accent="amber" spark={<Sparkline color="#F59E0B" />} />
          <MetricCard label="Taxa de qualificação" value={`${taxa}%`} delta="+2.1pp vs ontem" icon={<Target className="h-4 w-4" />} accent="cyan" spark={<Sparkline color="#06B6D4" />} />
          <MetricCard label="Qualificados hoje" value={qualificados} delta="+38 vs ontem" icon={<CheckCircle2 className="h-4 w-4" />} accent="success" spark={<Sparkline color="#10B981" />} />
          <MetricCard label="Chamadas ativas" value={<span className="inline-flex items-center gap-2">{ativas}<span className="pulse-dot inline-block h-2 w-2 rounded-full bg-primary text-primary" /></span>} delta="ao vivo agora" icon={<Radio className="h-4 w-4" />} accent="amber" footer={<Waveform color="#F59E0B" bars={22} height={20} />} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 xl:col-span-2">
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">Ligações por hora</h3>
                <p className="text-xs text-muted-foreground">Últimas 24h · todas as campanhas</p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-amber" /> Ligações</span>
                <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-success" /> Qualificados</span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={callsByHour} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="g-amber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1E1E2E" vertical={false} />
                  <XAxis dataKey="hora" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#12121A", border: "1px solid #1E1E2E", borderRadius: 12, fontSize: 12 }} />
                  <Area dataKey="ligacoes" stroke="#F59E0B" strokeWidth={2.5} fill="url(#g-amber)" type="monotone" />
                  <Line dataKey="qualificados" stroke="#10B981" strokeWidth={2} type="monotone" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-4 font-display text-base font-semibold">Campanhas ativas</h3>
            <div className="space-y-4">
              {campaigns.filter(c => c.status === "ativa").map(c => {
                const progress = Math.round(((c.totalLeads - c.pendingLeads) / Math.max(1, c.totalLeads)) * 100);
                const ag = agents.find(a => a.id === c.agentId)!;
                return (
                  <div key={c.id} className="rounded-xl border border-border bg-background/50 p-3">
                    <div className="mb-2 flex items-center gap-2.5">
                      <AgentAvatar name={ag.name} color={ag.avatarColor} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{ag.name} · {c.pendingLeads} pendentes</p>
                      </div>
                      <span className="font-mono text-xs text-amber">{c.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber to-cyan" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="font-display text-base font-semibold">Atividade em tempo real</h3>
              <p className="text-xs text-muted-foreground">Atualização ao vivo via Realtime</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-success" /> Conectado
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-3 py-3 font-medium">Campanha</th>
                  <th className="px-3 py-3 font-medium">Agente</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Duração</th>
                  <th className="px-3 py-3 font-medium">Quando</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((l) => {
                  const ag = agents.find(a => a.name === l.agentName);
                  return (
                    <tr key={l.id} className="border-b border-border/60 transition-colors hover:bg-background/40">
                      <td className="px-5 py-3">
                        <div className="font-medium">{l.nome}</div>
                        <div className="font-mono text-xs text-muted-foreground">{l.telefone}</div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{l.campaignName?.split("—")[0]}</td>
                      <td className="px-3 py-3">
                        {ag && <div className="flex items-center gap-2"><AgentAvatar name={ag.name} color={ag.avatarColor} size={24} /><span className="text-xs">{ag.name}</span></div>}
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-3 py-3 font-mono text-xs">{l.durationSeconds ? `${Math.floor(l.durationSeconds/60)}:${String(l.durationSeconds%60).padStart(2,"0")}` : "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{l.lastCallAt ? new Date(l.lastCallAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" className="gap-1.5"><Play className="h-3.5 w-3.5" /> Ouvir</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
