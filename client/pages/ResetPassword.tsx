import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { performPasswordReset } from "@/services/auth";
import AppBrand from "@/components/common/AppBrand";

export default function ResetPasswordPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const acesso = useMemo(() => sp.get("acesso") || sp.get("email") || "", [sp]);
  const token = useMemo(() => sp.get("token") || "", [sp]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disabled = !acesso || !token || password.length < 6 || password !== confirm || submitting;

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [acesso, token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await performPasswordReset({ acesso, token, password });
      if (!res.success) {
        throw new Error(res.message || "Não foi possível redefinir a senha");
      }
      setSuccess("Senha redefinida com sucesso. Você será redirecionado para o login.");
      setTimeout(() => navigate("/"), 2000);
    } catch (e: any) {
      setError(e?.message || "Falha ao redefinir senha");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center"><AppBrand /></div>
        <Card>
          <CardHeader>
            <CardTitle>Redefinir senha</CardTitle>
          </CardHeader>
          <CardContent>
            {!acesso || !token ? (
              <div className="text-sm text-red-600">Link inválido ou incompleto. Verifique se o endereço possui os parâmetros <b>acesso</b> (ou <b>email</b>) e <b>token</b>.</div>
            ) : (
              <form className="space-y-3" onSubmit={onSubmit}>
                <div>
                  <div className="text-xs text-muted-foreground">Login</div>
                  <Input value={acesso} readOnly className="bg-slate-50" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Nova senha</div>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Confirmar senha</div>
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a senha" />
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
                {success && <div className="text-sm text-green-600">{success}</div>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => navigate("/")}>Cancelar</Button>
                  <Button type="submit" disabled={disabled}>{submitting ? "Enviando..." : "Redefinir"}</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


