import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, AlertCircle, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createRealtimeSession } from "@/lib/realtime.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/testar-agente")({
  component: TestarAgentePage,
});

type Status = "idle" | "connecting" | "live" | "ending" | "error";

type TranscriptItem = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function TestarAgentePage() {
  const startSession = useServerFn(createRealtimeSession);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [muted, setMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const cleanup = useCallback(() => {
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (audioElRef.current) audioElRef.current.srcObject = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleEvent = useCallback((raw: string) => {
    try {
      const ev = JSON.parse(raw) as { type: string; [k: string]: unknown };
      if (ev.type === "response.audio_transcript.delta") {
        const delta = String(ev.delta ?? "");
        const id = String(ev.response_id ?? "asst");
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.id === id) {
            return [...prev.slice(0, -1), { ...last, text: last.text + delta }];
          }
          return [...prev, { id, role: "assistant", text: delta }];
        });
      } else if (ev.type === "conversation.item.input_audio_transcription.completed") {
        const text = String(ev.transcript ?? "").trim();
        if (text) {
          setTranscript((prev) => [
            ...prev,
            { id: String(ev.item_id ?? Date.now()), role: "user", text },
          ]);
        }
      } else if (ev.type === "error") {
        const msg = (ev.error as { message?: string } | undefined)?.message ?? "Erro desconhecido";
        setError(msg);
      }
    } catch {
      /* ignore non-JSON */
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setTranscript([]);
    setStatus("connecting");
    try {
      const session = await startSession();
      if (!session.ok) throw new Error(session.error);

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Áudio remoto (voz do agente)
      pc.ontrack = (ev) => {
        if (audioElRef.current) {
          audioElRef.current.srcObject = ev.streams[0];
          audioElRef.current.play().catch(() => {});
        }
      };

      // Microfone local
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

      // Data channel para eventos
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (ev) => handleEvent(String(ev.data));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );
      if (!sdpRes.ok) throw new Error(`OpenAI SDP ${sdpRes.status}: ${await sdpRes.text()}`);
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setStatus("live");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
      cleanup();
    }
  }, [cleanup, handleEvent, startSession]);

  const stop = useCallback(() => {
    setStatus("ending");
    cleanup();
    setStatus("idle");
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    const next = !muted;
    tracks.forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Testar agente</h1>
        <p className="text-sm text-muted-foreground">
          Converse com o agente direto pelo navegador, sem ligação real. Usa o prompt, voz e
          idioma configurados em <strong>Agentes</strong>.
        </p>
      </header>

      <Card className="overflow-hidden border-border/60">
        <div className="flex flex-col items-center gap-6 px-6 py-10">
          <div
            className={cn(
              "relative flex h-32 w-32 items-center justify-center rounded-full border transition-all",
              status === "live"
                ? "border-primary bg-primary/10 shadow-[0_0_60px_-10px_hsl(var(--primary))]"
                : status === "connecting"
                  ? "border-muted-foreground/40 bg-muted"
                  : "border-border bg-card",
            )}
          >
            {status === "live" && (
              <span className="absolute inset-0 animate-ping rounded-full border border-primary/40" />
            )}
            {status === "connecting" ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : muted && status === "live" ? (
              <MicOff className="h-10 w-10 text-destructive" />
            ) : (
              <Mic
                className={cn(
                  "h-10 w-10 transition-colors",
                  status === "live" ? "text-primary" : "text-muted-foreground",
                )}
              />
            )}
          </div>

          <p className="text-sm font-medium">
            {status === "idle" && "Pronto pra começar"}
            {status === "connecting" && "Conectando ao agente…"}
            {status === "live" && "Em linha — fale normalmente"}
            {status === "ending" && "Encerrando…"}
            {status === "error" && "Falha ao conectar"}
          </p>

          <div className="flex items-center gap-3">
            {status === "live" ? (
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
              <Button
                size="lg"
                onClick={start}
                disabled={status === "connecting" || status === "ending"}
              >
                {status === "connecting" ? (
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
                key={`${item.id}-${item.role}`}
                className={cn(
                  "flex flex-col gap-1",
                  item.role === "user" ? "items-end" : "items-start",
                )}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {item.role === "user" ? "Você" : "Agente"}
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

      <audio ref={audioElRef} autoPlay playsInline className="hidden" />
    </div>
  );
}