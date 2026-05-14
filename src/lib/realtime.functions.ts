import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Cria uma "ephemeral session" no OpenAI Realtime e devolve o client_secret
 * pro browser conectar via WebRTC. A chave OPENAI_API_KEY nunca sai do servidor.
 */
export const createRealtimeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "OPENAI_API_KEY não configurada no servidor." };
    }

    const { supabase, userId } = context;

    // Busca a config do agente do usuário pra usar a mesma voz/idioma/prompt
    const { data: agentRow } = await supabase
      .from("integrations_config")
      .select("values")
      .eq("user_id", userId)
      .eq("provider", "voice_agent")
      .maybeSingle();

    const agent = (agentRow?.values as Record<string, string> | null) ?? {};
    const voice = agent.voice || "alloy";
    const language = agent.language || "pt-BR";
    const instructions =
      agent.agent_prompt ||
      "Você é um agente de voz educado e prestativo. Responda em português brasileiro de forma natural e concisa.";

    try {
      const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice,
          modalities: ["audio", "text"],
          instructions: `${instructions}\n\nIdioma preferido: ${language}.`,
          input_audio_transcription: { model: "whisper-1" },
          turn_detection: { type: "server_vad" },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          ok: false as const,
          error: `OpenAI ${res.status}: ${text.slice(0, 240)}`,
        };
      }

      const json = (await res.json()) as {
        client_secret?: { value?: string; expires_at?: number };
      };
      const clientSecret = json.client_secret?.value;
      if (!clientSecret) {
        return { ok: false as const, error: "OpenAI não retornou client_secret." };
      }
      return {
        ok: true as const,
        clientSecret,
        expiresAt: json.client_secret?.expires_at ?? null,
        voice,
        language,
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });