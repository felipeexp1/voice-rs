import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const E164 = /^\+[1-9]\d{6,14}$/;

/** Lista as chamadas do usuário autenticado, mais recentes primeiro. */
export const listCalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("calls")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { calls: data ?? [] };
  });

/** Inicia uma chamada outbound via Twilio. */
export const startOutboundCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        to: z.string().regex(E164, "Número destino inválido (use formato E.164, ex: +5511999999999)"),
        callerId: z
          .string()
          .regex(E164)
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Pega as integrações do usuário
    const { data: configs, error: cfgErr } = await supabase
      .from("integrations_config")
      .select("provider, values")
      .in("provider", ["twilio", "voice_agent"]);
    if (cfgErr) throw new Error(cfgErr.message);

    const map = new Map<string, Record<string, string>>();
    for (const row of configs ?? []) {
      map.set(row.provider, (row.values as Record<string, string>) ?? {});
    }

    const twilio = map.get("twilio");
    if (!twilio?.accountSid || !twilio?.authToken || !twilio?.from) {
      throw new Error(
        "Twilio não configurado. Vá em Configurações → Telefonia → Twilio e preencha Account SID, Auth Token e Número de origem.",
      );
    }

    // Caller ID: prioridade → param da chamada > callerIdOverride salvo (Vono) > from Twilio
    const fromNumber = data.callerId || twilio.callerIdOverride || twilio.from;
    const amdEnabled = twilio.amdEnabled !== "false"; // default ON

    // 2. URL do TwiML pra esta conta — derivamos do host do request atual
    const req = getRequest();
    const reqUrl = new URL(req.url);
    const isLocal =
      reqUrl.hostname === "localhost" ||
      reqUrl.hostname === "127.0.0.1" ||
      reqUrl.hostname.endsWith(".local");
    const baseUrl =
      process.env.PUBLIC_APP_URL ||
      (isLocal
        ? "https://voice-rs.lovable.app"
        : `${reqUrl.protocol}//${reqUrl.host}`);
    const twimlUrl = `${baseUrl}/api/public/twilio-voice?u=${userId}`;
    const statusUrl = `${baseUrl}/api/public/twilio-status?u=${userId}`;

    // 3. Cria registro pendente na tabela calls
    const { data: callRow, error: insErr } = await supabase
      .from("calls")
      .insert({
        user_id: userId,
        direction: "outbound",
        from_number: fromNumber,
        to_number: data.to,
        status: "initiated",
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    // 4. Chama Twilio REST
    const auth = "Basic " + Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString("base64");
    const params: Record<string, string> = {
      To: data.to,
      From: fromNumber,
      Url: twimlUrl,
      StatusCallback: statusUrl,
      StatusCallbackEvent: "initiated ringing answered completed",
      StatusCallbackMethod: "POST",
    };
    if (amdEnabled) {
      // Detecção assíncrona de secretária eletrônica — Twilio entrega resultado via StatusCallback
      params.MachineDetection = "DetectMessageEnd";
      params.AsyncAmd = "true";
      params.AsyncAmdStatusCallback = statusUrl;
      params.AsyncAmdStatusCallbackMethod = "POST";
    }
    const body = new URLSearchParams(params);

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Calls.json`,
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    const respJson = (await resp.json()) as { sid?: string; message?: string; code?: number };

    if (!resp.ok) {
      // marca como falha
      await supabase
        .from("calls")
        .update({ status: "failed" })
        .eq("id", callRow.id);
      throw new Error(`Twilio ${resp.status}: ${respJson.message ?? "erro desconhecido"}`);
    }

    // 5. Atualiza com SID
    await supabase
      .from("calls")
      .update({ twilio_call_sid: respJson.sid, status: "queued" })
      .eq("id", callRow.id);

    return { ok: true as const, callId: callRow.id, twilioSid: respJson.sid };
  });
