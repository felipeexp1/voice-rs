/**
 * VoiceRS Media Bridge — Twilio Media Streams ↔ ElevenLabs Conversational AI
 *
 * Faz a ponte entre o áudio µ-law/8kHz da Twilio e o agente do ElevenLabs
 * Conv AI (que aceita formatos de telefonia nativamente). Usa o agent_id
 * configurado pelo usuário e injeta dynamic variables do lead (nome,
 * numero_processo, polo_ativo, valor_causa, classe_processo) pra que a
 * Sofia leia cada caso corretamente.
 *
 * Variáveis de ambiente:
 *   ELEVENLABS_API_KEY    - obrigatória pra agentes privados (signed URL)
 *   SUPABASE_URL          - opcional, pra persistir transcrições
 *   SUPABASE_SERVICE_KEY  - idem
 *   PORT                  - default 8080
 */

import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { createClient } from "@supabase/supabase-js";

const PORT = process.env.PORT || 8080;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!ELEVEN_KEY) {
  console.warn("[bridge] ELEVENLABS_API_KEY ausente — só vai funcionar com agentes públicos");
}

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

const server = http.createServer((req, res) => {
  if (req.url === "/health") { res.writeHead(200); res.end("ok"); return; }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server, path: "/twilio-media" });

async function getElevenSocketUrl(agentId) {
  // Tenta signed URL (agentes privados). Se não tiver chave, cai no público.
  if (!ELEVEN_KEY) {
    return `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(agentId)}`;
  }
  const r = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    { headers: { "xi-api-key": ELEVEN_KEY } },
  );
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`signed-url ${r.status}: ${txt.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.signed_url;
}

wss.on("connection", (twilioWs) => {
  console.log("[bridge] Twilio conectou");
  let elevenWs = null;
  let streamSid = null;
  let callSid = null;
  let userId = null;
  const transcript = [];

  function persist() {
    if (!supabase || !callSid || transcript.length === 0) return;
    supabase.from("calls")
      .update({ transcript, ended_at: new Date().toISOString() })
      .eq("twilio_call_sid", callSid)
      .then(({ error }) => error && console.error("[bridge] persist:", error.message));
  }

  function closeAll() {
    persist();
    try { elevenWs?.close(); } catch {}
    try { twilioWs.close(); } catch {}
  }

  twilioWs.on("message", async (raw) => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.event === "start") {
      streamSid = msg.start.streamSid;
      const params = msg.start.customParameters || {};
      callSid = params.callSid || msg.start.callSid;
      userId = params.userId;
      const agentId = params.agentId;
      const voiceId = params.voiceId || "";
      const prompt = params.agentPrompt || "";
      const firstMessage = params.firstMessage || "";
      const language = params.language || "pt";

      if (!agentId) {
        console.error("[bridge] sem agentId nos custom parameters — encerrando");
        closeAll();
        return;
      }

      console.log(`[bridge] start streamSid=${streamSid} callSid=${callSid} agent=${agentId}`);

      // Dynamic variables do lead — qualquer param fora do conjunto reservado vira dyn var
      const reserved = new Set(["callSid", "userId", "agentId", "voiceId", "agentPrompt", "firstMessage", "language", "voice"]);
      const dynamic_variables = {};
      for (const [k, v] of Object.entries(params)) {
        if (!reserved.has(k) && v) dynamic_variables[k] = v;
      }

      let url;
      try { url = await getElevenSocketUrl(agentId); }
      catch (e) { console.error("[bridge] signed-url falhou:", e.message); closeAll(); return; }

      elevenWs = new WebSocket(url);

      elevenWs.on("open", () => {
        // Configuração inicial — overrides + formato µ-law/8k pra casar com Twilio
        const init = {
          type: "conversation_initiation_client_data",
          dynamic_variables,
          conversation_config_override: {
            agent: {
              language,
              ...(prompt ? { prompt: { prompt } } : {}),
              ...(firstMessage ? { first_message: firstMessage } : {}),
            },
            ...(voiceId ? { tts: { voice_id: voiceId } } : {}),
            conversation: {
              text_only: false,
            },
          },
        };
        elevenWs.send(JSON.stringify(init));
        console.log("[bridge] init enviado pro ElevenLabs");
      });

      elevenWs.on("message", (data) => {
        let evt; try { evt = JSON.parse(data.toString()); } catch { return; }

        switch (evt.type) {
          case "conversation_initiation_metadata":
            // ok
            break;
          case "ping": {
            const id = evt.ping_event?.event_id;
            if (id != null) elevenWs.send(JSON.stringify({ type: "pong", event_id: id }));
            break;
          }
          case "audio": {
            const b64 = evt.audio_event?.audio_base_64;
            if (b64 && streamSid) {
              twilioWs.send(JSON.stringify({
                event: "media", streamSid, media: { payload: b64 },
              }));
            }
            break;
          }
          case "interruption":
            if (streamSid) twilioWs.send(JSON.stringify({ event: "clear", streamSid }));
            break;
          case "user_transcript": {
            const t = evt.user_transcription_event?.user_transcript;
            if (t) transcript.push({ role: "user", text: t });
            break;
          }
          case "agent_response": {
            const t = evt.agent_response_event?.agent_response;
            if (t) transcript.push({ role: "assistant", text: t });
            break;
          }
          case "agent_response_correction": {
            const t = evt.agent_response_correction_event?.corrected_agent_response;
            if (t) transcript.push({ role: "assistant", text: `[corrigido] ${t}` });
            break;
          }
        }
      });

      elevenWs.on("close", (code) => console.log(`[bridge] ElevenLabs fechou code=${code}`));
      elevenWs.on("error", (e) => console.error("[bridge] ElevenLabs WS error:", e.message));
    }

    if (msg.event === "media" && elevenWs?.readyState === WebSocket.OPEN) {
      elevenWs.send(JSON.stringify({ user_audio_chunk: msg.media.payload }));
    }

    if (msg.event === "stop") {
      console.log("[bridge] Twilio stop");
      closeAll();
    }
  });

  twilioWs.on("close", () => { console.log("[bridge] Twilio fechou"); closeAll(); });
  twilioWs.on("error", (e) => console.error("[bridge] Twilio WS error:", e.message));
});

server.listen(PORT, () => console.log(`[bridge] rodando em :${PORT}`));
