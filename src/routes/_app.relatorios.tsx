import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/voicers/Topbar";
import { agents, callsByHour, funnel, heatmap } from "@/data/mock";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";
import { Download, TrendingUp, Trophy, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "@/components/voicers/AgentAvatar";

export const Route = createFileRoute("/_app/relatorios")({
  component: Relatorios,
  head: () => ({ meta: [{ title: "Relatórios — VoiceRS" }] }),
});

function Relatorios() {
  const totalFunnel = funnel[0].valor;

  return (
    <>
      <Topbar
        title="Relatórios & Analytics"
        subtitle="Performance da operação · últimos 30 dias"
        actions={<Button variant="outline" className="gap-1.5"><Download className="h-4 w-4" /> Exportar</Button>}
      />
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Highlight icon={<Clock className="h-4 w-4" />} label="Melhor horário" value="14h–16h" sub="44% atendimento" />
          <Highlight icon={<Trophy className="h-4 w-4" />} label="Top agente" value="Marcos" sub="41.7% conversão" accent="cyan" />
          <Highlight icon={<Award className="h-4 w-4" />} label="Campanha mais eficiente" value="Analistas Jurídicos" sub="91 qualificados" accent="success" />
          <Highlight icon={<TrendingUp className="h-4 w-4" />} label="Turnos médios p/ qualificar" value="4.2" sub="-0.6 vs mês anterior" />
        </div>

        {/* Funnel */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-1 font-display text-base font-semibold">Funil de conversão</h3>
          <p className="mb-5 text-xs text-muted-foreground">De lead bruto até WhatsApp enviado</p>
          <div className="space-y-2.5">
            {funnel.map((f, i) => {
              const pct = (f.valor / totalFunnel) * 100;
              const conversion = i === 0 ? 100 : (f.valor / funnel[i-1].valor) * 100;
              const colors = ["#F59E0B", "#F59E0B", "#FBBF24", "#A3E635", "#34D399", "#10B981"];
              return (
                <div key={f.etapa} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{f.etapa}</span>
                    <span className="font-mono text-muted-foreground">{f.valor.toLocaleString("pt-BR")} · {conversion.toFixed(1)}%</span>
                  </div>
                  <div className="relative h-9 overflow-hidden rounded-lg bg-background/50">
                    <div className="absolute inset-y-0 left-0 flex items-center justify-end px-3 text-xs font-semibold text-background transition-all"
                         style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${colors[i]}cc, ${colors[i]})` }}>
                      {pct.toFixed(0)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Hourly */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-1 font-display text-base font-semibold">Volume por hora</h3>
            <p className="mb-4 text-xs text-muted-foreground">Ligações × qualificados</p>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={callsByHour} margin={{ top: 5, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="#1E1E2E" vertical={false} />
                  <XAxis dataKey="hora" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#12121A", border: "1px solid #1E1E2E", borderRadius: 12, fontSize: 12 }} />
                  <Line dataKey="ligacoes" stroke="#F59E0B" strokeWidth={2.5} dot={false} type="monotone" />
                  <Line dataKey="qualificados" stroke="#10B981" strokeWidth={2.5} dot={false} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Agents bar */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-1 font-display text-base font-semibold">Conversão por agente</h3>
            <p className="mb-4 text-xs text-muted-foreground">Taxa de qualificação no período</p>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={agents.map(a => ({ name: a.name, taxa: a.conversionRate, color: a.avatarColor }))} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#1E1E2E" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                  <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} width={70} />
                  <Tooltip contentStyle={{ background: "#12121A", border: "1px solid #1E1E2E", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="taxa" radius={[0, 6, 6, 0]}>
                    {agents.map((a, i) => <Cell key={i} fill={a.avatarColor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Heatmap */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-1 font-display text-base font-semibold">Heatmap de atendimento</h3>
          <p className="mb-5 text-xs text-muted-foreground">Taxa de atendimento por dia × hora</p>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex gap-1 pl-12 text-[10px] text-muted-foreground">
                {Array.from({ length: 13 }).map((_, i) => <div key={i} className="w-8 text-center font-mono">{8+i}h</div>)}
              </div>
              {heatmap.map(row => (
                <div key={row.dia} className="mt-1 flex items-center gap-1">
                  <div className="w-12 text-right text-xs font-medium text-muted-foreground">{row.dia}</div>
                  {row.horas.map(c => (
                    <div key={c.hora} className="h-8 w-8 rounded transition-transform hover:scale-110"
                         title={`${row.dia} ${c.hora}h — ${c.valor}%`}
                         style={{ background: `oklch(0.78 0.165 70 / ${0.08 + (c.valor/100)*0.8})` }} />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>0%</span>
              <div className="h-2 w-40 rounded-full" style={{ background: "linear-gradient(to right, oklch(0.78 0.165 70 / 0.08), oklch(0.78 0.165 70 / 0.9))" }} />
              <span>100%</span>
            </div>
          </div>
        </section>

        {/* Performance table */}
        <section className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-display text-base font-semibold">Performance por agente</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Agente</th>
                  <th className="px-3 py-3 font-medium">Voz</th>
                  <th className="px-3 py-3 font-medium text-right">Ligações</th>
                  <th className="px-3 py-3 font-medium text-right">Qualif.</th>
                  <th className="px-3 py-3 font-medium text-right">Conversão</th>
                  <th className="px-5 py-3 font-medium text-right">Dur. média</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(a => (
                  <tr key={a.id} className="border-b border-border/60 hover:bg-background/40">
                    <td className="px-5 py-3"><div className="flex items-center gap-2.5"><AgentAvatar name={a.name} color={a.avatarColor} size={28} /><span className="font-medium">{a.name}</span></div></td>
                    <td className="px-3 py-3 text-muted-foreground">{a.voiceName}</td>
                    <td className="px-3 py-3 text-right font-mono">{a.totalCalls?.toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-3 text-right font-mono text-success">{Math.round((a.totalCalls ?? 0) * (a.conversionRate ?? 0) / 100)}</td>
                    <td className="px-3 py-3 text-right font-mono text-amber">{a.conversionRate?.toFixed(1)}%</td>
                    <td className="px-5 py-3 text-right font-mono">{a.avgDuration}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function Highlight({ icon, label, value, sub, accent = "amber" }: { icon: React.ReactNode; label: string; value: string; sub: string; accent?: "amber" | "cyan" | "success" }) {
  const c = { amber: "text-amber", cyan: "text-cyan", success: "text-success" }[accent];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className={`mb-3 inline-flex rounded-lg border border-border bg-background/60 p-2 ${c}`}>{icon}</div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
