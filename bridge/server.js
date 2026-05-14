/**
 * VoiceRS Media Bridge — Twilio Media Streams ↔ OpenAI Realtime
 *
 * Deploy em Fly.io grátis (ver bridge/README.md). Uma única instância
 * aguenta ~30 chamadas simultâneas confortavelmente.
 *
 * Variáveis de ambiente obrigatórias:
 *   OPENAI_API_KEY        - sua chave do platform.openai.com
 *   SUPABASE_URL          - URL do projeto Lovable Cloud
 *   SUPABASE_SERVICE_KEY  - service role key (pra gravar transcrições)
 *   PORT                  - default 8080
 */

import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { createClient } from "@supabase/supabase-js";

const PORT = process.env.PORT || 8080;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!OPENAI_KEY) { console.error("OPENAI_API_KEY ausente"); process.exit(1); }

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

const server = http.createServer((req, res) => {
  if (req.url === "/health") { res.writeHead(200); res.end("ok"); return; }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server, path: "/twilio-media" });

wss.on("connection", (twilioWs) => {
  console.log("[bridge] Twilio conectou");
  let openaiWs = null;
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

  twilioWs.on("message", (raw) => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.event === "start") {
      streamSid = msg.start.streamSid;
      const params = msg.start.customParameters || {};
      callSid = params.callSid || msg.start.callSid;
      userId = params.userId;
      const voice = params.voice || "alloy";
      const agentPrompt = params.agentPrompt || "Você é um agente de voz educado e prestativo. Responda em português brasileiro de forma natural e concisa.";

      console.log(`[bridge] start streamSid=${streamSid} callSid=${callSid} voice=${voice}`);

      // Conecta na OpenAI Realtime
      openaiWs = new WebSocket(
        "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
        { headers: { Authorization: `Bearer ${OPENAI_KEY}`, "OpenAI-Beta": "realtime=v1" } },
      );

      openaiWs.on("open", () => {
        openaiWs.send(JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            instructions: agentPrompt,
            voice,
            input_audio_format: "g711_ulaw",
            output_audio_format: "g711_ulaw",
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 600 },
            temperature: 0.7,
          },
        }));
        // Faz a IA falar primeiro
        openaiWs.send(JSON.stringify({ type: "response.create" }));
      });

      openaiWs.on("message", (data) => {
        let evt; try { evt = JSON.parse(data.toString()); } catch { return; }
        if (evt.type === "response.audio.delta" && evt.delta) {
          twilioWs.send(JSON.stringify({
            event: "media", streamSid, media: { payload: evt.delta },
          }));
        } else if (evt.type === "response.audio_transcript.done") {
          transcript.push({ role: "assistant", text: evt.transcript });
        } else if (evt.type === "conversation.item.input_audio_transcription.completed") {
          transcript.push({ role: "user", text: evt.transcript });
        } else if (evt.type === "error") {
          console.error("[bridge] OpenAI error:", evt.error);
        }
      });

      openaiWs.on("close", () => console.log("[bridge] OpenAI fechou"));
      openaiWs.on("error", (e) => console.error("[bridge] OpenAI WS error:", e.message));
    }

    if (msg.event === "media" && openaiWs?.readyState === WebSocket.OPEN) {
      openaiWs.send(JSON.stringify({
        type: "input_audio_buffer.append",
        audio: msg.media.payload,
      }));
    }

    if (msg.event === "stop") {
      console.log("[bridge] Twilio stop");
      persist();
      openaiWs?.close();
    }
  });

  twilioWs.on("close", () => {
    console.log("[bridge] Twilio fechou");
    persist();
    openaiWs?.close();
  });

  twilioWs.on("error", (e) => console.error("[bridge] Twilio WS error:", e.message));
});

server.listen(PORT, () => console.log(`[bridge] rodando em :${PORT}`));
