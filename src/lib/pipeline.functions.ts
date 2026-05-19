import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const COLD_STATUSES = ["nao_atendeu", "caixa_postal", "recusado", "pessoa_errada"];

/** Lista leads "frios" elegíveis para reaquecimento (status frio + última ligação há >= X dias). */
export const listColdLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ days: z.number().int().min(0).max(365).default(3) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const cutoff = new Date(Date.now() - data.days * 86400_000).toISOString();
    const { data: rows, error } = await supabase
      .from("leads")
      .select("*")
      .in("status", COLD_STATUSES)
      .or(`last_call_at.is.null,last_call_at.lte.${cutoff}`)
      .order("last_call_at", { ascending: true, nullsFirst: true })
      .limit(2000);
    if (error) throw new Error(error.message);
    return { leads: rows ?? [], days: data.days };
  });

/** Lista a fila de leads fechados (qualificado/agendado), agrupados por telefone. */
export const listClosedQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("leads")
      .select("*")
      .in("status", ["qualificado", "agendado"])
      .order("last_call_at", { ascending: false, nullsFirst: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    type Row = NonNullable<typeof rows>[number];
    const byPhone = new Map<string, { phone: string; primary: Row; duplicates: Row[] }>();
    for (const r of rows ?? []) {
      const key = (r.telefone ?? "").replace(/\D/g, "");
      if (!key) continue;
      const existing = byPhone.get(key);
      if (!existing) byPhone.set(key, { phone: r.telefone, primary: r, duplicates: [] });
      else existing.duplicates.push(r);
    }
    return { groups: Array.from(byPhone.values()) };
  });