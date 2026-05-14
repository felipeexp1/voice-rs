import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Topbar } from "@/components/voicers/Topbar";
import { Button } from "@/components/ui/button";
import {
  Phone, Mic, MessageSquare, Cog, Eye, EyeOff, Brain, Headphones,
  Database, Webhook, Server, Plug, CheckCircle2, AlertCircle, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/configuracoes")({
  component: Configuracoes,
  head: () => ({ meta: [{ title: "Configurações — VoiceRS" }] }),
});

const tabs = [
  { id: "integracoes", label: "Integrações", icon: Plug },
  { id: "operacao",    label: "Operação",    icon: Cog },
  { id: "equipe",      label: "Equipe & acesso", icon: Users },
] as const;

function Configuracoes() {
  const [tab, setTab] = useState<typeof tabs[number]["id"]>("integracoes");

  return (
    <>
      <Topbar title="Configurações" subtitle="Centralize aqui todas as conexões necessárias para o VoiceRS operar" />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1 self-start rounded-2xl border border-border bg-card p-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                tab === t.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === "integracoes" && <Integracoes />}
          {tab === "operacao" && <Operacao />}
          {tab === "equipe" && <Equipe />}
        </div>
      </div>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none", props.className)} />;
}

function Secret({ placeholder }: { placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} placeholder={placeholder} />
      <button onClick={() => setShow(s => !s)} type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

type Status = "connected" | "pending" | "optional";

function StatusPill({ status }: { status: Status }) {
  const map = {
    connected: { label: "Conectado", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", Icon: CheckCircle2 },
    pending:   { label: "Pendente",  cls: "bg-amber/10 text-amber border-amber/30",                   Icon: AlertCircle },
    optional:  { label: "Opcional",  cls: "bg-secondary text-muted-foreground border-border",         Icon: Plug },
  } as const;
  const { label, cls, Icon } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cls)}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function IntegrationCard({
  icon: Icon, name, category, description, status, required, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string; category: string; description: string;
  status: Status; required?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card transition-colors hover:border-border/80">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-4 p-5 text-left">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-background">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold">{name}</h3>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{category}</span>
            {required && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Obrigatório</span>}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <StatusPill status={status} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-border p-5">
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm">Testar conexão</Button>
            <Button size="sm">Salvar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 mt-6 flex items-baseline justify-between first:mt-0">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Integracoes() {
  return (
    <div>
      <CategoryHeader title="Telefonia" hint="ao menos um provedor é necessário" />
      <div className="space-y-3">
        <IntegrationCard icon={Phone} name="Twilio" category="Voz outbound" required status="pending"
          description="Provedor primário para originar chamadas e receber callbacks de status.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Account SID"><Secret placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxx" /></Field>
            <Field label="Auth Token"><Secret placeholder="••••••••••••••••" /></Field>
            <Field label="Número de origem" hint="formato E.164"><Input placeholder="+5511404000000" /></Field>
            <Field label="Webhook de status"><Input placeholder="https://voicers.app/api/public/twilio" /></Field>
          </div>
        </IntegrationCard>

        <IntegrationCard icon={Phone} name="Vono" category="Voz outbound (BR)" status="optional"
          description="Provedor alternativo nacional, usado em fallback ou custos menores em DDDs específicos.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="API Key"><Secret placeholder="••••••••••••••••" /></Field>
            <Field label="Número de origem"><Input placeholder="+5511404000001" /></Field>
          </div>
        </IntegrationCard>

        <IntegrationCard icon={Server} name="Bridge de mídia" category="Streaming RTP ↔ WebSocket" required status="pending"
          description="Microserviço Node.js que faz a ponte entre o áudio da operadora e a IA em tempo real.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Bridge URL"><Input placeholder="wss://bridge.voicers.app" /></Field>
            <Field label="Secret token"><Secret placeholder="••••••••••••••••" /></Field>
          </div>
        </IntegrationCard>
      </div>

      <CategoryHeader title="Inteligência conversacional" />
      <div className="space-y-3">
        <IntegrationCard icon={Brain} name="OpenAI" category="LLM — raciocínio" required status="pending"
          description="Modelo principal que entende o lead, qualifica e decide próximas ações.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="API Key"><Secret placeholder="sk-..." /></Field>
            <Field label="Modelo padrão">
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option>gpt-4o</option>
                <option>gpt-4o-mini</option>
                <option>gpt-4.1</option>
              </select>
            </Field>
            <Field label="Temperatura" hint="0.1 preciso → 0.9 criativo">
              <input type="range" min="0.1" max="0.9" step="0.05" defaultValue="0.3" className="w-full accent-primary" />
            </Field>
            <Field label="Organização (opcional)"><Input placeholder="org-..." /></Field>
          </div>
        </IntegrationCard>

        <IntegrationCard icon={Mic} name="ElevenLabs" category="TTS — síntese de voz" required status="pending"
          description="Gera as vozes ultra-realistas dos agentes em pt-BR com baixa latência.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="API Key global" hint="sobrepõe a do agente se preenchida"><Secret placeholder="••••••••••••••••" /></Field>
            <Field label="Modelo">
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option>eleven_multilingual_v2</option>
                <option>eleven_turbo_v2_5</option>
                <option>eleven_flash_v2_5</option>
              </select>
            </Field>
          </div>
        </IntegrationCard>

        <IntegrationCard icon={Headphones} name="Deepgram" category="STT — transcrição em tempo real" required status="pending"
          description="Transcreve a fala do lead em streaming para o LLM responder em <500ms.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="API Key"><Secret placeholder="••••••••••••••••" /></Field>
            <Field label="Modelo">
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option>nova-2-general</option>
                <option>nova-2-phonecall</option>
                <option>whisper-large</option>
              </select>
            </Field>
          </div>
        </IntegrationCard>
      </div>

      <CategoryHeader title="Mensageria & follow-up" />
      <div className="space-y-3">
        <IntegrationCard icon={MessageSquare} name="WhatsApp Business (Meta)" category="Disparo pós-qualificação" status="pending"
          description="Envia template aprovado automaticamente quando o lead é qualificado.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Token Meta API"><Secret placeholder="EAAxxxxxxxxxxx" /></Field>
              <Field label="Phone Number ID"><Input placeholder="123456789012345" /></Field>
              <Field label="Business Account ID"><Input placeholder="098765432109876" /></Field>
              <Field label="Nome do template"><Input placeholder="prospeccao_juridica" /></Field>
            </div>
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Preview do template</p>
              <p className="text-sm leading-relaxed">
                Olá <span className="rounded bg-amber/15 px-1.5 py-0.5 font-mono text-amber">{"{{1}}"}</span>! Aqui é a equipe da <span className="rounded bg-amber/15 px-1.5 py-0.5 font-mono text-amber">{"{{2}}"}</span>. Conforme nossa conversa, segue o resumo da próxima etapa…
              </p>
            </div>
        </IntegrationCard>
      </div>

      <CategoryHeader title="Dados & integrações" />
      <div className="space-y-3">
        <IntegrationCard icon={Database} name="Lovable Cloud" category="Banco de dados, auth e storage" required status="connected"
          description="Persiste leads, agentes, gravações e histórico de chamadas. Provisionado automaticamente.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Project URL"><Input readOnly defaultValue="https://voicers.lovable.cloud" /></Field>
            <Field label="Região"><Input readOnly defaultValue="South America (São Paulo)" /></Field>
          </div>
          <p className="text-xs text-muted-foreground">Para gerenciar tabelas e RLS, abra o painel do Cloud.</p>
        </IntegrationCard>

        <IntegrationCard icon={Webhook} name="CRM externo" category="Webhook outbound" status="optional"
          description="Envia eventos (lead qualificado, chamada concluída, agendamento) para seu CRM.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Endpoint"><Input placeholder="https://crm.empresa.com/hooks/voicers" /></Field>
            <Field label="Assinatura HMAC"><Secret placeholder="••••••••••••••••" /></Field>
          </div>
          <Field label="Eventos">
            <div className="flex flex-wrap gap-2 text-sm">
              {["lead.qualified", "call.completed", "appointment.booked", "opt_out"].map(e => (
                <label key={e} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
                  <input type="checkbox" defaultChecked className="accent-primary" /> <code className="text-xs">{e}</code>
                </label>
              ))}
            </div>
          </Field>
        </IntegrationCard>
      </div>
    </div>
  );
}

function Operacao() {
  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 className="font-display text-lg font-semibold">Regras de operação</h2>
        <p className="text-sm text-muted-foreground">Limites globais aplicados a todas as campanhas.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Fuso horário">
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option>America/Sao_Paulo (UTC-3)</option>
            <option>America/Manaus (UTC-4)</option>
          </select>
        </Field>
        <Field label="Horário permitido"><Input defaultValue="08:00 — 20:00" /></Field>
        <Field label="Máx. chamadas simultâneas"><Input type="number" defaultValue={10} /></Field>
        <Field label="Intervalo mín. entre tentativas (h)"><Input type="number" defaultValue={6} /></Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline">Salvar como rascunho</Button>
        <Button>Testar sistema completo</Button>
      </div>
    </div>
  );
}

function Equipe() {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 className="font-display text-lg font-semibold">Equipe & acesso</h2>
        <p className="text-sm text-muted-foreground">Gerencie quem pode operar campanhas, escutar chamadas e editar agentes.</p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-background/50 p-8 text-center text-sm text-muted-foreground">
        Conecte o Lovable Cloud Auth para começar a convidar usuários.
      </div>
    </div>
  );
}
