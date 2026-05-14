import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PayloadSchema = z.object({
  provider: z.enum([
    "twilio",
    "vono",
    "bridge",
    "openai",
    "elevenlabs",
    "deepgram",
    "whatsapp",
    "webhook",
    "voice_agent",
  ]),
  values: z.record(z.string(), z.string()).default({}),
});

type TestResult = { ok: boolean; message: string; latencyMs?: number };

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const t = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - t };
}

function need(values: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    if (!values[k] || !values[k].trim()) return `Campo obrigatório ausente: ${k}`;
  }
  return null;
}

async function testTwilio(v: Record<string, string>): Promise<TestResult> {
  const miss = need(v, ["accountSid", "authToken"]);
  if (miss) return { ok: false, message: miss };
  const auth = "Basic " + Buffer.from(`${v.accountSid}:${v.authToken}`).toString("base64");
  const { result, ms } = await timed(() =>
    fetch(`https://api.twilio.com/2010-04-01/Accounts/${v.accountSid}.json`, {
      headers: { Authorization: auth },
    }),
  );
  if (result.ok) return { ok: true, message: "Credenciais Twilio válidas.", latencyMs: ms };
  const body = await result.text();
  return { ok: false, message: `Twilio ${result.status}: ${body.slice(0, 180)}` };
}

async function testVono(v: Record<string, string>): Promise<TestResult> {
  const miss = need(v, ["apiKey"]);
  if (miss) return { ok: false, message: miss };
  // Vono não publica endpoint de health-check estável; validamos formato.
  if (v.apiKey.length < 16) return { ok: false, message: "API Key da Vono parece curta demais." };
  return { ok: true, message: "API Key armazenada. Validação real ocorre na 1ª chamada." };
}

async function testBridge(v: Record<string, string>): Promise<TestResult> {
  const miss = need(v, ["url"]);
  if (miss) return { ok: false, message: miss };
  const httpUrl = v.url.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
  try {
    const { result, ms } = await timed(() =>
      fetch(`${httpUrl.replace(/\/$/, "")}/health`, {
        headers: v.secret ? { Authorization: `Bearer ${v.secret}` } : {},
      }),
    );
    if (result.ok) return { ok: true, message: "Bridge respondeu /health.", latencyMs: ms };
    return { ok: false, message: `Bridge ${result.status} em /health.` };
  } catch (e) {
    return { ok: false, message: `Não foi possível alcançar a Bridge: ${(e as Error).message}` };
  }
}

async function testOpenAI(v: Record<string, string>): Promise<TestResult> {
  const miss = need(v, ["apiKey"]);
  if (miss) return { ok: false, message: miss };
  const headers: Record<string, string> = { Authorization: `Bearer ${v.apiKey}` };
  if (v.org) headers["OpenAI-Organization"] = v.org;
  const { result, ms } = await timed(() => fetch("https://api.openai.com/v1/models", { headers }));
  if (result.ok) return { ok: true, message: "OpenAI autenticado com sucesso.", latencyMs: ms };
  return { ok: false, message: `OpenAI ${result.status}: ${(await result.text()).slice(0, 180)}` };
}

async function testElevenLabs(v: Record<string, string>): Promise<TestResult> {
  const miss = need(v, ["apiKey"]);
  if (miss) return { ok: false, message: miss };
  const { result, ms } = await timed(() =>
    fetch("https://api.elevenlabs.io/v1/user", { headers: { "xi-api-key": v.apiKey } }),
  );
  if (result.ok) return { ok: true, message: "ElevenLabs autenticado.", latencyMs: ms };
  return { ok: false, message: `ElevenLabs ${result.status}: ${(await result.text()).slice(0, 180)}` };
}

async function testDeepgram(v: Record<string, string>): Promise<TestResult> {
  const miss = need(v, ["apiKey"]);
  if (miss) return { ok: false, message: miss };
  const { result, ms } = await timed(() =>
    fetch("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${v.apiKey}` },
    }),
  );
  if (result.ok) return { ok: true, message: "Deepgram autenticado.", latencyMs: ms };
  return { ok: false, message: `Deepgram ${result.status}: ${(await result.text()).slice(0, 180)}` };
}

async function testWhatsApp(v: Record<string, string>): Promise<TestResult> {
  const miss = need(v, ["token", "phoneId"]);
  if (miss) return { ok: false, message: miss };
  const { result, ms } = await timed(() =>
    fetch(`https://graph.facebook.com/v20.0/${v.phoneId}`, {
      headers: { Authorization: `Bearer ${v.token}` },
    }),
  );
  if (result.ok) return { ok: true, message: "WhatsApp Business API ok.", latencyMs: ms };
  return { ok: false, message: `Meta ${result.status}: ${(await result.text()).slice(0, 180)}` };
}

async function testWebhook(v: Record<string, string>): Promise<TestResult> {
  const miss = need(v, ["endpoint"]);
  if (miss) return { ok: false, message: miss };
  try {
    const payload = JSON.stringify({ event: "voicers.ping", at: new Date().toISOString() });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (v.hmac) headers["X-Voicers-Signature"] = "sha256=" + v.hmac.slice(0, 8) + "...";
    const { result, ms } = await timed(() =>
      fetch(v.endpoint, { method: "POST", headers, body: payload }),
    );
    if (result.status < 500)
      return { ok: result.ok, message: `Webhook respondeu ${result.status}.`, latencyMs: ms };
    return { ok: false, message: `Webhook ${result.status}.` };
  } catch (e) {
    return { ok: false, message: `Falha de rede: ${(e as Error).message}` };
  }
}

export const testIntegration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PayloadSchema.parse(input))
  .handler(async ({ data }): Promise<TestResult> => {
    try {
      switch (data.provider) {
        case "twilio": return await testTwilio(data.values);
        case "vono": return await testVono(data.values);
        case "bridge": return await testBridge(data.values);
        case "openai": return await testOpenAI(data.values);
        case "elevenlabs": return await testElevenLabs(data.values);
        case "deepgram": return await testDeepgram(data.values);
        case "whatsapp": return await testWhatsApp(data.values);
        case "webhook": return await testWebhook(data.values);
        case "voice_agent":
          return { ok: true, message: "Configurações do agente salvas." };
      }
      return { ok: false, message: "Provider não suportado." };
    } catch (e) {
      return { ok: false, message: (e as Error).message ?? "Erro desconhecido." };
    }
  });

export const listIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("integrations_config")
      .select("provider, values")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const map: Record<string, Record<string, string>> = {};
    for (const row of data ?? []) map[row.provider] = (row.values as Record<string, string>) ?? {};
    return map;
  });

export const saveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PayloadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("integrations_config")
      .upsert(
        { user_id: userId, provider: data.provider, values: data.values },
        { onConflict: "user_id,provider" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });