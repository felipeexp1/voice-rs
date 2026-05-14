import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lista as vozes da conta ElevenLabs do projeto.
 * Usa a ELEVENLABS_API_KEY do servidor.
 */
export const listElevenLabsVoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "ELEVENLABS_API_KEY não configurada." };
    }
    try {
      const res = await fetch("https://api.elevenlabs.io/v2/voices?page_size=100", {
        headers: { "xi-api-key": apiKey },
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false as const, error: `ElevenLabs ${res.status}: ${text.slice(0, 200)}` };
      }
      const json = (await res.json()) as {
        voices?: Array<{
          voice_id: string;
          name: string;
          labels?: Record<string, string>;
          category?: string;
        }>;
      };
      const voices = (json.voices ?? []).map((v) => ({
        id: v.voice_id,
        name: v.name,
        category: v.category ?? null,
        language: v.labels?.language ?? v.labels?.accent ?? null,
        gender: v.labels?.gender ?? null,
        description: v.labels?.description ?? null,
      }));
      return { ok: true as const, voices };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });

/**
 * Cria um conversation token (WebRTC) pra um agent_id do ElevenLabs Conversational AI.
 * O agent é criado no painel do ElevenLabs (https://elevenlabs.io/app/conversational-ai).
 * Aceita overrides opcionais de prompt/firstMessage/voiceId pra injetar contexto do lead.
 */
export const createElevenLabsConvToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        agentId: z.string().min(1, "agentId é obrigatório"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "ELEVENLABS_API_KEY não configurada." };
    }
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(data.agentId)}`,
        { headers: { "xi-api-key": apiKey } },
      );
      if (!res.ok) {
        const text = await res.text();
        return { ok: false as const, error: `ElevenLabs ${res.status}: ${text.slice(0, 240)}` };
      }
      const json = (await res.json()) as { token?: string };
      if (!json.token) return { ok: false as const, error: "Resposta sem token." };
      return { ok: true as const, token: json.token };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });