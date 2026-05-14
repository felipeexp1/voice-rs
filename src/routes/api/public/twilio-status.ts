import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Recebe StatusCallback da Twilio (initiated/ringing/answered/completed).
 * Atualiza a linha em `calls` correspondente.
 */

async function handle(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("ok", { status: 200 });
  }

  const form = await request.formData();
  const callSid = String(form.get("CallSid") ?? "");
  const callStatus = String(form.get("CallStatus") ?? "");
  const duration = form.get("CallDuration");
  const recordingUrl = form.get("RecordingUrl");

  if (!callSid) return new Response("ok", { status: 200 });

  const update: {
    status: string;
    started_at?: string;
    ended_at?: string;
    duration_seconds?: number;
    recording_url?: string;
  } = { status: callStatus };
  if (callStatus === "in-progress" || callStatus === "answered") {
    update.started_at = new Date().toISOString();
  }
  if (callStatus === "completed" || callStatus === "failed" || callStatus === "no-answer" || callStatus === "busy" || callStatus === "canceled") {
    update.ended_at = new Date().toISOString();
    if (duration) update.duration_seconds = Number(duration);
  }
  if (recordingUrl) update.recording_url = String(recordingUrl);

  await supabaseAdmin.from("calls").update(update).eq("twilio_call_sid", callSid);

  return new Response("ok", { status: 200 });
}

export const Route = createFileRoute("/api/public/twilio-status")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
