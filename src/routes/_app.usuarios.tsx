import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createUser, deleteUser, isAdmin, listUsers } from "@/lib/users.functions";

export const Route = createFileRoute("/_app/usuarios")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: UsuariosPage,
  head: () => ({ meta: [{ title: "Usuários — Rocha & Silva" }] }),
});

type Row = {
  id: string;
  email: string;
  username?: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
};

function UsuariosPage() {
  const checkAdmin = useServerFn(isAdmin);
  const fetchUsers = useServerFn(listUsers);
  const addUser = useServerFn(createUser);
  const removeUser = useServerFn(deleteUser);

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");

  async function reload() {
    setLoading(true);
    try {
      const list = await fetchUsers();
      setRows(list as Row[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await checkAdmin();
        setAllowed(r.admin);
        if (r.admin) await reload();
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addUser({ data: { username, password, role } });
      toast.success("Usuário criado.");
      setUsername(""); setPassword(""); setRole("user");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este usuário?")) return;
    try {
      await removeUser({ data: { id } });
      toast.success("Usuário removido.");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (allowed === false) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h1 className="font-display text-xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">Apenas administradores podem gerenciar usuários.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Usuários</h1>
          <p className="text-sm text-muted-foreground">Ferramenta interna — apenas administradores podem cadastrar.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Novo usuário</h2>
          </div>
          <label className="mb-3 block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Login (usuário)</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={2}
              placeholder="ex: maria.silva"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </label>
          <label className="mb-3 block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Senha</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </label>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Perfil</span>
            <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "user")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="user">Operador</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Criar usuário
          </Button>
        </form>

        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-display text-base font-semibold">
              Cadastrados {rows.length > 0 && <span className="text-muted-foreground">({rows.length})</span>}
            </h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-5 py-2 text-left">Usuário</th><th className="px-5 py-2 text-left">E-mail</th><th className="px-5 py-2 text-left">Perfil</th><th className="px-5 py-2 text-left">Último acesso</th><th className="px-5 py-2"></th></tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium">{u.username ?? u.email.split("@")[0]}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3">
                      {u.roles.includes("admin") ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Operador</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleDelete(u.id)}
                        className="inline-flex items-center gap-1 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum usuário cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
