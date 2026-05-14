import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Mic, MicOff, Loader2, AlertCircle, Volume2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createElevenLabsConvToken } from "@/lib/elevenlabs.functions";
import { listIntegrations } from "@/lib/integrations.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/testar-agente")({
  component: TestarAgentePage,
  head: () => ({ meta: [{ title: "Testar agente — VoiceRS" }] }),
});

type TranscriptItem = { id: string; role: "user" | "assistant"; text: string };

function TestarAgentePage() {
  const fetchIntegrations = useServerFn(listIntegrations);
  const getToken = useServerFn(createElevenLabsConvToken);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [agentIdOverride, setAgentIdOverride] = useState("");

  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => fetchIntegrations(),
  });

  const savedAgentId = integrations?.voice_agent?.elevenlabs_agent_id ?? "";
  const agentId = agentIdOverride.trim() || savedAgentId;

  const conversation = useConversation({
    onConnect: () => setError(null),
    onDisconnect: () => {},
    onError: (err) => setError(typeof err === "string" ? err : "Erro na conversa."),
    onMessage: (msg: { source?: string; message?: string }) => {
      const text = msg.message ?? "";
      if (!text) return;
      const role = msg.source === "user" ? "user" : "assistant";
      setTranscript((prev) => [
        ...prev,
        { id: `${Date.now()}-${prev.length}`, role, text },
      ]);
    },
  });

  const status = conversation.status;
  const isSpeaking = conversation.isSpeaking;

  const start = useCallback(async () => {
    setError(null);
    setTranscript([]);
    if (!agentId) {
      setError(
        "Configure o ElevenLabs Agent ID em Configurações → Agente de voz (ou cole abaixo).",
      );
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const tokenRes = await getToken({ data: { agentId } });
      if (!tokenRes.ok) throw new Error(tokenRes.error);
      await conversation.startSession({
        conversationToken: tokenRes.token,
        connectionType: "webrtc",
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [agentId, conversation, getToken]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const toggleMute = useCallback(async () => {
    const next = !muted;
    setMuted(next);
    try {
      await conversation.setVolume({ volume: next ? 0 : 1 });
    } catch {
      /* noop */
    }
  }, [conversation, muted]);

  const isLive = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Testar agente</h1>
        <p className="text-sm text-muted-foreground">
          Converse com a Sofia direto pelo navegador via{" "}
          <strong>ElevenLabs Conversational AI</strong>. A voz, o prompt e o
          comportamento vêm do agente configurado no painel do ElevenLabs.
        </p>
      </header>

      {!savedAgentId && (
        <Card className="border-amber/40 bg-amber/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
            <div className="space-y-2 text-sm">
              <p>
                Você ainda não salvou um <strong>ElevenLabs Agent ID</strong>.
                Crie um agente em{" "}
                <a
                  href="https://elevenlabs.io/app/conversational-ai"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-amber underline"
                >
                  elevenlabs.io <ExternalLink className="h-3 w-3" />
                </a>{" "}
                e cole o ID em <strong>Configurações → Agente de voz</strong>,
                ou cole aqui pra testar agora:
              </p>
              <input
                value={agentIdOverride}
                onChange={(e) => setAgentIdOverride(e.target.value)}
                placeholder="agent_xxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden border-border/60">
        <div className="flex flex-col items-center gap-6 px-6 py-10">
          <div
            className={cn(
              "relative flex h-32 w-32 items-center justify-center rounded-full border transition-all",
              isLive
                ? "border-primary bg-primary/10 shadow-[0_0_60px_-10px_hsl(var(--primary))]"
                : isConnecting
                  ? "border-muted-foreground/40 bg-muted"
                  : "border-border bg-card",
            )}
          >
            {isLive && (
              <span
                className={cn(
                  "absolute inset-0 rounded-full border",
                  isSpeaking ? "animate-ping border-amber/50" : "border-primary/30",
                )}
              />
            )}
            {isConnecting ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : muted && isLive ? (
              <MicOff className="h-10 w-10 text-destructive" />
            ) : (
              <Mic
                className={cn(
                  "h-10 w-10 transition-colors",
                  isLive ? "text-primary" : "text-muted-foreground",
                )}
              />
            )}
          </div>

          <p className="text-sm font-medium">
            {status === "disconnected" && "Pronto pra começar"}
            {isConnecting && "Conectando ao agente…"}
            {isLive && (isSpeaking ? "Sofia está falando…" : "Em linha — fale normalmente")}
          </p>

          <div className="flex items-center gap-3">
            {isLive ? (
              <>
                <Button variant="outline" onClick={toggleMute}>
                  {muted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                  {muted ? "Desmutar" : "Mutar"}
                </Button>
                <Button variant="destructive" onClick={stop}>
                  Encerrar
                </Button>
              </>
            ) : (
              <Button size="lg" onClick={start} disabled={isConnecting || !agentId}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando
                  </>
                ) : (
                  <>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Iniciar conversa
                  </>
                )}
              </Button>
            )}
          </div>

          {error && (
            <div className="flex w-full items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="border-border/60">
        <div className="border-b border-border/60 px-5 py-3">
          <h2 className="text-sm font-semibold">Transcrição em tempo real</h2>
        </div>
        <div className="max-h-[400px] space-y-3 overflow-y-auto p-5">
          {transcript.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              A conversa aparece aqui assim que você começar a falar.
            </p>
          ) : (
            transcript.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col gap-1",
                  item.role === "user" ? "items-end" : "items-start",
                )}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {item.role === "user" ? "Você" : "Sofia"}
                </span>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    item.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {item.text}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}