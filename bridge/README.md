# VoiceRS Media Bridge

Microserviço Node.js que faz a ponte entre **Twilio Media Streams** (áudio da ligação) e **OpenAI Realtime API** (IA conversacional). Roda separado do Lovable porque WebSockets de longa duração não funcionam bem em Cloudflare Workers.

## Capacidade

- ~30 chamadas simultâneas em VM compartilhada de 512MB
- Sem conversão de áudio (μ-law 8kHz nativo dos dois lados → CPU mínimo)
- Latência ~400-600ms

## Deploy no Fly.io (grátis, ~5 minutos)

### 1. Instale a CLI
```bash
curl -L https://fly.io/install.sh | sh
fly auth signup   # ou: fly auth login
```

### 2. Pegue suas chaves
- **OPENAI_API_KEY**: https://platform.openai.com/api-keys (precisa de saldo na conta OpenAI)
- **SUPABASE_URL**: já está no seu `.env` do Lovable como `VITE_SUPABASE_URL`
- **SUPABASE_SERVICE_KEY**: pegue no Backend → Settings → API → `service_role` (NUNCA exponha no frontend)

### 3. Lance
```bash
cd bridge
fly launch --no-deploy --copy-config --name voicers-bridge   # responda "n" pra Postgres/Redis

fly secrets set \
  OPENAI_API_KEY="sk-..." \
  SUPABASE_URL="https://xxxxx.supabase.co" \
  SUPABASE_SERVICE_KEY="eyJhbGc..."

fly deploy
```

Após o deploy, o Fly mostra a URL. Algo como: `https://voicers-bridge.fly.dev`

### 4. Configure no VoiceRS
Vá em **Configurações → Telefonia → Bridge de mídia** e cole:
- **Bridge URL**: `wss://voicers-bridge.fly.dev`

### 5. Configure o Twilio Console
Vá em https://console.twilio.com/ → Phone Numbers → seu número → Voice → "A call comes in":
- **Webhook**: `https://voice-rs.lovable.app/api/public/twilio-voice` (URL mostrada no card Bridge das Configurações)
- **Method**: HTTP POST

## Teste local

```bash
cd bridge
npm install
OPENAI_API_KEY=sk-... node server.js
# pra Twilio alcançar localhost, use ngrok:
# ngrok http 8080  →  use o URL wss://xxxxx.ngrok.io
```

## Custos estimados

- **Fly.io**: grátis até ~256MB de RAM × 3 VMs (cabe folgado)
- **Twilio**: ~US$0,013/min de chamada
- **OpenAI Realtime**: ~US$0,06/min input + US$0,24/min output ≈ US$0,15/min médio
- **Total**: ~US$0,17/min de ligação

## Troubleshooting

- **Sem áudio**: verifique se o `Bridge URL` em Configurações começa com `wss://` (não `https://`)
- **Cliente escuta silêncio**: cheque os logs com `fly logs` — provavelmente OPENAI_API_KEY inválida ou sem saldo
- **Transcrição não aparece**: SUPABASE_SERVICE_KEY ausente ou inválida
- **Connection drops após 60s**: verifique `min_machines_running = 1` no fly.toml (impede o Fly de hibernar a VM)
