import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Webhook chamado pela Twilio quando uma ligação entra OU quando um outbound atende.
 * Retorna TwiML que abre uma sessão Media Streams contra o bridge externo do usuário.
 *
 * URL de inbound (cole no Twilio Console):
 *   https://<seu-dominio>/api/public/twilio-voice?u=<USER_ID>
 */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twimlError(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-BR" voice="Polly.Camila-Neural">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let userId = url.searchParams.get("u") ?? "";

  // Para inbound, Twilio manda os campos do POST como form-encoded.
  // Pegamos To (= seu número Twilio) e From (= número do cliente que ligou).
  let toNumber = "";
  let fromNumber = "";
  let callSid = "";
  if (request.method === "POST") {
    const form = await request.formData();
    toNumber = String(form.get("To") ?? "");
    fromNumber = String(form.get("From") ?? "");
    callSid = String(form.get("CallSid") ?? "");
  }

  // Se não temos userId no query (inbound puro sem ?u=), tentamos resolver pelo número
  if (!userId && toNumber) {
    const { data: row } = await supabaseAdmin
      .from("integrations_config")
      .select("user_id, values")
      .eq("provider", "twilio")
      .limit(50);
    const match = (row ?? []).find(
      (r) => (r.values as Record<string, string> | null)?.from === toNumber,
    );
    if (match) userId = match.user_id;
  }

  if (!userId) {
    return twimlError(
      "Configuração não encontrada. Verifique a URL do webhook no Twilio.",
    );
  }

  // Busca config do bridge e do agente desse usuário
  const { data: configs } = await supabaseAdmin
    .from("integrations_config")
    .select("provider, values")
    .eq("user_id", userId)
    .in("provider", ["bridge", "voice_agent"]);

  const map = new Map<string, Record<string, string>>();
  for (const row of configs ?? []) {
    map.set(row.provider, (row.values as Record<string, string>) ?? {});
  }

  const bridge = map.get("bridge");
  const agent = map.get("voice_agent") ?? {};

  if (!bridge?.url) {
    return twimlError(
      "Bridge de mídia não configurada. Configure em Configurações.",
    );
  }

  // Garante wss://
  const wsUrl = bridge.url.startsWith("ws") ? bridge.url : `wss://${bridge.url.replace(/^https?:\/\//, "")}`;
  const streamUrl = `${wsUrl.replace(/\/$/, "")}/twilio-media`;

  // Registra chamada inbound se ainda não existe
  if (request.method === "POST" && callSid && fromNumber && toNumber) {
    const { data: existing } = await supabaseAdmin
      .from("calls")
      .select("id")
      .eq("twilio_call_sid", callSid)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("calls").insert({
        user_id: userId,
        twilio_call_sid: callSid,
        direction: "inbound",
        from_number: fromNumber,
        to_number: toNumber,
        status: "ringing",
        started_at: new Date().toISOString(),
      });
    }
  }

  // Parâmetros customizados pro bridge — ele usa pra configurar a sessão OpenAI
  const params = [
    { name: "userId", value: userId },
    { name: "callSid", value: callSid },
    { name: "voice", value: agent.voice || "alloy" },
    { name: "language", value: agent.language || "pt-BR" },
    { name: "agentPrompt", value: (agent.agent_prompt || "Você é um agente de voz educado e prestativo. Responda em português brasileiro de forma natural e concisa.").slice(0, 2000) },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(streamUrl)}">
${params.map((p) => `      <Parameter name="${escapeXml(p.name)}" value="${escapeXml(p.value)}"/>`).join("\n")}
    </Stream>
  </Connect>
</Response>`;

  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/public/twilio-voice")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
