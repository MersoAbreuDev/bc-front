import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCurrentUser, login, logout } from "@/services/auth/api";
import { useNavigate } from "react-router-dom";

function validatePassword(pw: string): string | null {
  if (!pw || pw.length < 8) return "Mínimo de 8 caracteres";
  if (!/[A-Z]/.test(pw)) return "Inclua ao menos uma letra maiúscula";
  if (!/[a-z]/.test(pw)) return "Inclua ao menos uma letra minúscula";
  if (!/\d/.test(pw)) return "Inclua ao menos um número";
  if (!/[!@#$%^&*(),.?":{}|<>_+\-=/\\\[\];'`~]/.test(pw)) return "Inclua ao menos um caractere especial";
  return null;
}

export default function FirstAccessChangePassword() {
  const navigate = useNavigate();
  const user = getCurrentUser() as any;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = useMemo(() => {
    if (submitting) return true;
    if (password !== confirm) return true;
    return Boolean(validatePassword(password));
  }, [password, confirm, submitting]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validatePassword(password);
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);
    try {
      // Opção A: tentativa PATCH /users/:id (ADMIN/MASTER). Caso 403/401, cair para fluxo de reset.
      const base = (import.meta as any).env?.VITE_API_URL || "http://localhost:5337";
      const url = `${String(base).replace(/\/$/, "")}/users/${encodeURIComponent(user?.id)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
          ...(user?.tenantId ? { "x-tenantid": String(user.tenantId) } : {}),
        },
        body: JSON.stringify({ password }),
      });
      if (res.status === 401 || res.status === 403) {
        // fallback: fluxo de reset
        const req = await fetch(`${String(base).replace(/\/$/, "")}/password-reset/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acesso: user?.document }),
        });
        const reqData: any = await (async () => { try { return await req.json(); } catch { return undefined; } })();
        if (!req.ok) throw new Error(reqData?.message || "Falha ao solicitar reset");
        const token = (reqData?.token || reqData?.resetToken) as string | undefined;
        if (!token) throw new Error("Token de reset não retornado");
        const fin = await fetch(`${String(base).replace(/\/$/, "")}/password-reset/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acesso: user?.document, token, password }),
        });
        if (!fin.ok) {
          const jd: any = await (async () => { try { return await fin.json(); } catch { return undefined; } })();
          throw new Error(jd?.message || "Falha ao concluir reset");
        }
      } else if (!res.ok) {
        const jd: any = await (async () => { try { return await res.json(); } catch { return undefined; } })();
        throw new Error(jd?.message || `Erro ${res.status}`);
      }

      // Sucesso: força novo login para limpar mustChangePassword do JWT
      const docType = user?.docType || "cpf";
      const document = user?.document || "";
      const oldPass = ""; // não temos a senha antiga; exige reentrada do usuário
      logout();
      navigate("/", { replace: true });
      // Dica UX: mostrar toast na tela de login pedindo nova autenticação
    } catch (e: any) {
      setError(e?.message || "Falha ao alterar senha");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Primeiro acesso • Alterar senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <div className="text-xs text-muted-foreground">Nova senha</div>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Confirmação</div>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button type="submit" className="w-full" loading={submitting} loadingText="Alterando...">Alterar senha</Button>
          </form>
          <div className="text-xs text-muted-foreground mt-3">
            Requisitos: mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e especiais.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


