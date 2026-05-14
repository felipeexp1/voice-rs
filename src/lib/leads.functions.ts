import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Lista os leads do usuário autenticado. */
export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return { leads: data ?? [] };
  });

const LeadInput = z.object({
  nome: z.string().trim().min(1).max(200),
  telefone: z.string().trim().min(8).max(32),
  numero_processo: z.string().trim().max(80).optional().nullable(),
  polo_ativo: z.string().trim().max(300).optional().nullable(),
  valor_causa: z.number().nullable().optional(),
  classe_processo: z.string().trim().max(200).optional().nullable(),
});

/** Importa uma lista de leads (vinda de CSV/planilha). */
export const importLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ leads: z.array(LeadInput).min(1).max(5000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.leads.map((l) => ({
      user_id: userId,
      nome: l.nome,
      telefone: l.telefone,
      numero_processo: l.numero_processo ?? null,
      polo_ativo: l.polo_ativo ?? null,
      valor_causa: l.valor_causa ?? null,
      classe_processo: l.classe_processo ?? null,
    }));
    const { error, count } = await supabase
      .from("leads")
      .insert(rows, { count: "exact" });
    if (error) throw new Error(error.message);
    return { ok: true as const, inserted: count ?? rows.length };
  });

/** Apaga um lead. */
export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Apaga todos os leads do usuário. */
export const deleteAllLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("leads").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });