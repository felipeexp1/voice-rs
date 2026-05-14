import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logoRS from "@/assets/logo-rocha-silva.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — Rocha & Silva" }] }),
});

function LoginPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const email = username.includes("@")
        ? username.toLowerCase()
        : `${username.toLowerCase()}@voicers.local`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("Login ou senha inválidos.");
      await router.invalidate();
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-grid p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <div className="mb-6 flex items-center gap-3">
          <img src={logoRS} alt="Rocha & Silva" className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="font-display text-lg font-semibold">Rocha & Silva</h1>
            <p className="text-xs text-muted-foreground">Call Center IA</p>
          </div>
        </div>
        <h2 className="mb-1 font-display text-xl font-semibold">Entrar</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Ferramenta interna. Apenas administradores podem cadastrar usuários.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Login</span>
            <input type="text" autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Admin"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Senha</span>
            <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}