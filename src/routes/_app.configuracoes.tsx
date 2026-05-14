import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { testIntegration, listIntegrations, saveIntegration } from "@/lib/integrations.functions";
import { Topbar } from "@/components/voicers/Topbar";
import { Button } from "@/components/ui/button";
import {
  Phone, Mic, MessageSquare, Cog, Eye, EyeOff, Brain, Headphones,
  Database, Webhook, Server, Plug, CheckCircle2, AlertCircle, Users, Download, Loader2,
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

function Secret({ placeholder, name }: { placeholder: string; name?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} placeholder={placeholder} name={name} />
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
  icon: Icon, name, category, description, status, required, children, provider, defaults,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string; category: string; description: string;
  status: Status; required?: boolean;
  children: React.ReactNode;
  provider?: "twilio" | "vono" | "bridge" | "openai" | "elevenlabs" | "deepgram" | "whatsapp" | "webhook";
  defaults?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const runTest = useServerFn(testIntegration);
  const runSave = useServerFn(saveIntegration);
  const qc = useQueryClient();

  useEffect(() => {
    if (!open || !defaults) return;
    const form = formRef.current;
    if (!form) return;
    for (const [k, v] of Object.entries(defaults)) {
      const el = form.elements.namedItem(k) as (HTMLInputElement | HTMLSelectElement | null);
      if (el && !el.value) el.value = v;
    }
  }, [open, defaults]);

  function gatherValues(): Record<string, string> {
    const form = formRef.current;
    if (!form) return {};
    const fd = new FormData(form);
    const values: Record<string, string> = {};
    fd.forEach((v, k) => { if (typeof v === "string") values[k] = v; });
    return values;
  }

  async function handleTest() {
    if (!provider) {
      toast.info("Esta integração ainda não tem teste automatizado.");
      return;
    }
    const values = gatherValues();
    setTesting(true);
    const t = toast.loading(`Testando ${name}…`);
    try {
      const res = await runTest({ data: { provider, values } });
      toast.dismiss(t);
      if (res.ok) {
        toast.success(`${name}: ${res.message}` + (res.latencyMs ? ` (${res.latencyMs}ms)` : ""));
      } else {
        toast.error(`${name}: ${res.message}`);
      }
    } catch (e) {
      toast.dismiss(t);
      toast.error(`${name}: ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!provider) {
      toast.info("Esta integração não pode ser salva.");
      return;
    }
    const values = gatherValues();
    setSaving(true);
    try {
      await runSave({ data: { provider, values } });
      toast.success(`${name}: configurações salvas.`);
      qc.invalidateQueries({ queryKey: ["integrations"] });
    } catch (e) {
      toast.error(`${name}: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

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
        <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-4 border-t border-border p-5">
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              {testing ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Testando…</> : "Testar conexão"}
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Salvando…</> : "Salvar"}
            </Button>
          </div>
        </form>
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
      <a
        href="/VoiceRS-Manual-Conexoes.pdf"
        download
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 flex items-center gap-3 rounded-2xl border border-amber/30 bg-gradient-to-r from-amber/10 to-cyan/5 p-4 transition-colors hover:border-amber/60"
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-amber/40 bg-amber/15 text-amber">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold">📥 Baixar manual (PDF)</p>
          <p className="text-xs text-muted-foreground">
            Guia passo a passo para configurar Twilio, OpenAI, ElevenLabs, Deepgram, WhatsApp e demais conexões.
          </p>
        </div>
        <span className="hidden text-xs font-medium text-amber sm:inline">Baixar →</span>
      </a>

      <CategoryHeader title="Telefonia" hint="ao menos um provedor é necessário" />
      <div className="space-y-3">
        <IntegrationCard icon={Phone} name="Twilio" category="Voz outbound" required status="pending" provider="twilio"
          description="Provedor primário para originar chamadas e receber callbacks de status.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Account SID"><Secret name="accountSid" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxx" /></Field>
            <Field label="Auth Token"><Secret name="authToken" placeholder="••••••••••••••••" /></Field>
            <Field label="Número de origem" hint="formato E.164"><Input name="from" placeholder="+5511404000000" /></Field>
            <Field label="Webhook de status"><Input name="webhook" placeholder="https://voicers.app/api/public/twilio" /></Field>
          </div>
        </IntegrationCard>

        <IntegrationCard icon={Phone} name="Vono" category="Voz outbound (BR)" status="optional" provider="vono"
          description="Provedor alternativo nacional, usado em fallback ou custos menores em DDDs específicos.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="API Key"><Secret name="apiKey" placeholder="••••••••••••••••" /></Field>
            <Field label="Número de origem"><Input name="from" placeholder="+5511404000001" /></Field>
          </div>
        </IntegrationCard>

        <IntegrationCard icon={Server} name="Bridge de mídia" category="Streaming RTP ↔ WebSocket" required status="pending" provider="bridge"
          description="Microserviço Node.js que faz a ponte entre o áudio da operadora e a IA em tempo real.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Bridge URL"><Input name="url" placeholder="wss://bridge.voicers.app" /></Field>
            <Field label="Secret token"><Secret name="secret" placeholder="••••••••••••••••" /></Field>
          </div>
        </IntegrationCard>
      </div>

      <CategoryHeader title="Inteligência conversacional" />
      <div className="space-y-3">
        <IntegrationCard icon={Brain} name="OpenAI" category="LLM — raciocínio" required status="pending" provider="openai"
          description="Modelo principal que entende o lead, qualifica e decide próximas ações.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="API Key"><Secret name="apiKey" placeholder="sk-..." /></Field>
            <Field label="Modelo padrão">
              <select name="model" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option>gpt-4o</option>
                <option>gpt-4o-mini</option>
                <option>gpt-4.1</option>
              </select>
            </Field>
            <Field label="Temperatura" hint="0.1 preciso → 0.9 criativo">
              <input name="temperature" type="range" min="0.1" max="0.9" step="0.05" defaultValue="0.3" className="w-full accent-primary" />
            </Field>
            <Field label="Organização (opcional)"><Input name="org" placeholder="org-..." /></Field>
          </div>
        </IntegrationCard>

        <IntegrationCard icon={Mic} name="ElevenLabs" category="TTS — síntese de voz" required status="pending" provider="elevenlabs"
          description="Gera as vozes ultra-realistas dos agentes em pt-BR com baixa latência.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="API Key global" hint="sobrepõe a do agente se preenchida"><Secret name="apiKey" placeholder="••••••••••••••••" /></Field>
            <Field label="Modelo">
              <select name="model" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option>eleven_multilingual_v2</option>
                <option>eleven_turbo_v2_5</option>
                <option>eleven_flash_v2_5</option>
              </select>
            </Field>
          </div>
        </IntegrationCard>

        <IntegrationCard icon={Headphones} name="Deepgram" category="STT — transcrição em tempo real" required status="pending" provider="deepgram"
          description="Transcreve a fala do lead em streaming para o LLM responder em <500ms.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="API Key"><Secret name="apiKey" placeholder="••••••••••••••••" /></Field>
            <Field label="Modelo">
              <select name="model" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
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
        <IntegrationCard icon={MessageSquare} name="WhatsApp Business (Meta)" category="Disparo pós-qualificação" status="pending" provider="whatsapp"
          description="Envia template aprovado automaticamente quando o lead é qualificado.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Token Meta API"><Secret name="token" placeholder="EAAxxxxxxxxxxx" /></Field>
              <Field label="Phone Number ID"><Input name="phoneId" placeholder="123456789012345" /></Field>
              <Field label="Business Account ID"><Input name="businessId" placeholder="098765432109876" /></Field>
              <Field label="Nome do template"><Input name="template" placeholder="prospeccao_juridica" /></Field>
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

        <IntegrationCard icon={Webhook} name="CRM externo" category="Webhook outbound" status="optional" provider="webhook"
          description="Envia eventos (lead qualificado, chamada concluída, agendamento) para seu CRM.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Endpoint"><Input name="endpoint" placeholder="https://crm.empresa.com/hooks/voicers" /></Field>
            <Field label="Assinatura HMAC"><Secret name="hmac" placeholder="••••••••••••••••" /></Field>
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
