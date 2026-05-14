## O que vai ser construído

Bridge de áudio em tempo real entre Twilio (telefonia) e OpenAI Realtime (IA conversacional), suportando até 30 chamadas simultâneas de 1-2 min, com chamadas **inbound** (cliente liga) e **outbound** (sistema disca).

## Arquitetura

```text
INBOUND:
Cliente disca número Twilio
   → Twilio chama webhook /api/public/twilio-voice (TwiML)
   → TwiML responde <Connect><Stream url="wss://.../api/public/twilio-media"/>
   → Twilio abre WebSocket, envia áudio μ-law 8kHz base64
   → Bridge encaminha pra OpenAI Realtime (g711_ulaw nativo, sem conversão)
   → OpenAI responde com áudio → bridge devolve pra Twilio → cliente escuta

OUTBOUND:
Usuário clica "Ligar" no app
   → Server function chama Twilio API: POST /Calls.json com From, To, Url=webhook acima
   → Twilio disca, quando atende cai no mesmo fluxo TwiML acima
```

## Componentes

**1. Banco (`calls` table)**
- `direction` (inbound/outbound), `from_number`, `to_number`, `status`, `started_at`, `ended_at`, `duration_seconds`, `transcript` (jsonb), `recording_url` (opcional), `user_id`
- RLS: usuário vê só as próprias chamadas

**2. Configurações (extensão da tabela `integrations_config`)**
- Provider novo: `voice_agent` com campos: `agent_prompt` (system prompt), `voice` (alloy/echo/shimmer/nova), `language` (pt-BR), `enabled`

**3. Server route `/api/public/twilio-voice`** (TwiML)
- Recebe webhook da Twilio quando entra ligação
- Retorna XML: `<Response><Connect><Stream url="wss://{host}/api/public/twilio-media"/></Connect></Response>`

**4. Server route `/api/public/twilio-media`** (WebSocket bridge)
- Aceita upgrade WebSocket da Twilio
- Abre conexão paralela com `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`
- Configura sessão OpenAI: `input_audio_format: g711_ulaw`, `output_audio_format: g711_ulaw`, voz, prompt
- Encaminha frames Twilio→OpenAI e OpenAI→Twilio
- Persiste transcrição na tabela `calls` ao final

**5. Server function `startOutboundCall`**
- Validação Zod: `to` (E.164), `agent_prompt` opcional override
- Chama Twilio REST `/Calls.json` via gateway connector
- Cria registro em `calls` com status `initiated`

**6. UI**
- `/configuracoes`: toggle "Usar Twilio Media Streams" + campo prompt do agente + select de voz + URL pra colar no Twilio Console
- `/chamadas`: lista das chamadas com transcrição expansível, botão "Ligar para…" (outbound)

## Detalhes técnicos

- **Sem conversão de áudio**: OpenAI Realtime aceita `g711_ulaw` 8kHz nativo (mesmo formato que Twilio manda) → zero CPU em resampling, ideal pra Cloudflare Workers
- **Limite Workers**: cada WS bridge roda em um Durable Object isolado pra ultrapassar o limite de 30s de CPU por request (padrão Workers)
- **Secret novo**: `OPENAI_API_KEY` (vou pedir via add_secret depois que você aprovar)
- **Twilio**: já está configurado via connector, vou usar `TWILIO_API_KEY` que você já tem
- **URL pra Twilio Console**: `https://voice-rs.lovable.app/api/public/twilio-voice` (o usuário cola em Phone Numbers → número → Voice → A Call Comes In = Webhook POST)

## Limitações conhecidas

- Cloudflare Workers tem soft-limit de ~100 WebSockets simultâneos por request inicial; pra 30 simultâneos usamos Durable Objects (1 por chamada) — dentro do limite confortável
- Chamadas >5 min podem precisar de keepalive extra; vou implementar ping a cada 20s
- Custo estimado: Twilio ~US$0,013/min + OpenAI Realtime ~US$0,06/min input + US$0,24/min output ≈ **US$0,15-0,20 por minuto de chamada**

## Ordem de implementação

1. Migration: tabela `calls` + RLS
2. Server route TwiML `/api/public/twilio-voice`
3. WebSocket bridge `/api/public/twilio-media` com Durable Object
4. Server function `startOutboundCall`
5. Tela `/chamadas` com lista + botão de discar
6. Toggle e campos no `/configuracoes`
7. Pedir `OPENAI_API_KEY` via secret
8. Testar com uma ligação real