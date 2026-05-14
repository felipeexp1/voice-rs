import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Topbar } from "@/components/voicers/Topbar";
import { Button } from "@/components/ui/button";
import { Phone, Mic, MessageSquare, Cog, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/configuracoes")({
  component: Configuracoes,
  head: () => ({ meta: [{ title: "Configurações — VoiceRS" }] }),
});

const tabs = [
  { id: "telefonia", label: "Telefonia", icon: Phone },
  { id: "ia",        label: "IA & Voz",  icon: Mic },
  { id: "whatsapp",  label: "WhatsApp",  icon: MessageSquare },
  { id: "sistema",   label: "Sistema",   icon: Cog },
] as const;

function Configuracoes() {
  const [tab, setTab] = useState<typeof tabs[number]["id"]>("telefonia");

  return (
    <>
      <Topbar title="Configurações" subtitle="Conexões com Twilio, ElevenLabs, OpenAI e WhatsApp" />
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

        <div className="rounded-2xl border border-border bg-card p-6">
          {tab === "telefonia" && <Telefonia />}
          {tab === "ia" && <IA />}
          {tab === "whatsapp" && <WhatsApp />}
          {tab === "sistema" && <Sistema />}
        </div>
      </div>
    </>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
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

function Telefonia() {
  return (
    <div className="space-y-8">
      <Section title="Twilio" description="Conta padrão para chamadas outbound">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Account SID"><Secret placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxx" /></Field>
          <Field label="Auth Token"><Secret placeholder="••••••••••••••••" /></Field>
          <Field label="Número de origem" hint="formato E.164"><Input placeholder="+5511404000000" /></Field>
        </div>
        <div className="flex gap-2"><Button variant="outline" size="sm">Testar conexão</Button></div>
      </Section>

      <div className="border-t border-border" />

      <Section title="Vono" description="Provedor alternativo">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="API Key"><Secret placeholder="••••••••••••••••" /></Field>
          <Field label="Número de origem"><Input placeholder="+5511404000001" /></Field>
        </div>
        <div className="flex gap-2"><Button variant="outline" size="sm">Testar conexão</Button></div>
      </Section>

      <div className="border-t border-border" />

      <Section title="Bridge" description="Microserviço Node.js que orquestra chamadas">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Bridge URL"><Input placeholder="https://bridge.voicers.app" /></Field>
          <Field label="Secret token"><Secret placeholder="••••••••••••••••" /></Field>
        </div>
      </Section>
    </div>
  );
}

function IA() {
  return (
    <div className="space-y-6">
      <Section title="Modelos de linguagem" description="Cérebro das conversas">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="OpenAI API Key"><Secret placeholder="sk-..." /></Field>
          <Field label="Modelo padrão">
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option>gpt-4o</option>
              <option>gpt-4o-mini</option>
            </select>
          </Field>
          <Field label="Temperatura padrão" hint="0.1 (preciso) → 0.9 (criativo)">
            <input type="range" min="0.1" max="0.9" step="0.05" defaultValue="0.3" className="w-full accent-primary" />
          </Field>
        </div>
      </Section>

      <div className="border-t border-border" />

      <Section title="Síntese de voz — ElevenLabs">
        <Field label="API Key global" hint="sobrepõe a do agente se preenchida"><Secret placeholder="••••••••••••••••" /></Field>
      </Section>
    </div>
  );
}

function WhatsApp() {
  return (
    <Section title="WhatsApp Business" description="Disparo automático após qualificação">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Token Meta API"><Secret placeholder="EAAxxxxxxxxxxx" /></Field>
        <Field label="Phone Number ID"><Input placeholder="123456789012345" /></Field>
        <Field label="Nome do template"><Input placeholder="prospeccao_juridica" /></Field>
      </div>
      <div className="rounded-xl border border-border bg-background/50 p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Preview do template</p>
        <p className="text-sm leading-relaxed">
          Olá <span className="rounded bg-amber/15 px-1.5 py-0.5 font-mono text-amber">{"{{1}}"}</span>! Aqui é a equipe da <span className="rounded bg-amber/15 px-1.5 py-0.5 font-mono text-amber">{"{{2}}"}</span>. Conforme nossa conversa, segue o resumo da próxima etapa…
        </p>
      </div>
    </Section>
  );
}

function Sistema() {
  return (
    <div className="space-y-6">
      <Section title="Operação">
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
      </Section>
      <div className="border-t border-border" />
      <div className="flex justify-end gap-2">
        <Button variant="outline">Salvar como rascunho</Button>
        <Button>Testar sistema completo</Button>
      </div>
    </div>
  );
}
