import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import type { DocType, LoginResponse, ForgotPasswordResponse } from "@shared/api";
import { login, forgotPassword, getCurrentUser } from "@/services/auth";
import { useNavigate } from "react-router-dom";
import {
  formatDocumentByType,
  isValidDocument,
  onlyDigits,
} from "@/lib/br-docs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AppBrand from "@/components/common/AppBrand";

function detectDocType(value: string): DocType {
  const v = (value || "").trim();
  // Se houver qualquer letra ou '@', tratamos como email para não bloquear a digitação
  if (/[A-Za-z@]/.test(v)) return "email" as DocType;
  const digits = onlyDigits(v);
  return (digits.length > 11 ? "cnpj" : "cpf") as DocType;
}

const loginSchema = z.object({
  document: z
    .string()
    .min(3, "Informe CPF, CNPJ ou email")
    .refine((val) => isValidDocument(detectDocType(val), val), "Documento ou email inválido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

type LoginSchema = z.infer<typeof loginSchema>;

export default function Index() {
  const navigate = useNavigate();
  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { document: "", password: "" },
    mode: "onChange",
  });

  const [typedValue, setTypedValue] = useState("");
  const [docType, setDocType] = useState<DocType>("cpf");

  useEffect(() => {
    setDocType(detectDocType(typedValue));
  }, [typedValue]);

  const onSubmit = async (values: LoginSchema) => {
    const dt = detectDocType(values.document);
    const payload = {
      docType: dt,
      document: dt === "email" ? values.document.trim() : onlyDigits(values.document),
      password: values.password,
    };

    try {
      const data: LoginResponse = await login(payload);
      if (!data.success) {
        // exibir modais específicos conforme status/código
        const status = String((data as any)?.status || "").toLowerCase();
        const code = String((data as any)?.code || "").toUpperCase();
        const msg = (data as any)?.message || "";
        const support = (data as any)?.support as string | undefined;
        if (status === "suspended" || code === "TENANT_SUSPENDED" || /suspens/i.test(msg)) {
          showBlockingModal("Sua empresa está suspensa no momento, procure o administrador do sistema", support);
          return;
        }
        if (status === "blocked" || code === "TENANT_BLOCKED" || /bloquead/i.test(msg)) {
          showBlockingModal("Empresa bloqueada, procure o administrador do sistema", support);
          return;
        }
        if (status === "pending" || code === "TENANT_PENDING" || /pendên/i.test(msg)) {
          showInfoModal("Sua empresa possui pendências que podem levar ao bloqueio. Procure o administrador do sistema.", support);
          return;
        }
        throw new Error(data.message || "Erro ao entrar");
      }
      // Se logou com status pendente ou houver tenantWarning, registra lembrete periódico
      const warn = (data as any)?.tenantWarning as string | undefined;
      if ((data as any)?.status === "pending" || (warn && warn.length > 0)) {
        // extrai número de suporte do texto se vier embutido
        const supportFromWarn = (warn?.match(/\(\d+\)\s?\d{4,5}-?\d{4}/)?.[0]) || (data as any)?.support;
        schedulePendingReminder(supportFromWarn);
        // mostra imediatamente também
        showInfoModal(warn || "Sua empresa possui pendências que podem levar ao bloqueio. Procure o administrador do sistema.", supportFromWarn);
      }
      const me: any = getCurrentUser();
      if (me?.mustChangePassword) {
        navigate("/primeiro-acesso/alterar-senha", { replace: true });
        return;
      }
      toast.success("Bem-vindo ao BComandas!");
      const role = String(me?.role || "").toUpperCase();
      const redirectByRole: Record<string, string> = {
        MASTER: "/dashboard",
        ADMIN: "/dashboard",
        CASHIER: "/dashboard",
        WAITER: "/comandas/abrir",
      };
      navigate(redirectByRole[role] || "/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Falha no login");
    }
  };

  function showBlockingModal(message: string, support?: string) {
    const el = document.createElement("div");
    const supportHtml = support ? `<div style=\"margin-top:8px;font-size:14px;color:#334155\"><b>Suporte:</b> ${support}<br/><b>Horário:</b> 08:00 às 18:00 (seg-sex), 08:00 às 12:00 (sáb-dom)</div>` : "";
    el.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999">\
      <div style="background:#fff;padding:16px;border-radius:8px;max-width:480px;width:90%">\
        <h3 style="margin:0 0 8px 0;font-size:18px;font-weight:600">Acesso indisponível</h3>\
        <div style="font-size:14px;color:#334155">${message}</div>\
        ${supportHtml}\
        <div style="margin-top:12px;display:flex;justify-content:flex-end;gap:8px">\
          <button id="modal-ok" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc">Ok</button>\
        </div>\
      </div>\
    </div>`;
    document.body.appendChild(el);
    const ok = el.querySelector('#modal-ok') as HTMLButtonElement | null;
    ok?.addEventListener('click', () => { document.body.removeChild(el); });
  }

  function schedulePendingReminder(support?: string) {
    const key = "bcomandas:pending:next";
    const now = Date.now();
    const stored = Number(localStorage.getItem(key) || 0);
    if (stored && stored > now) return; // já agendado
    const next = now + 10 * 60 * 1000; // 10 min
    localStorage.setItem(key, String(next));
    setTimeout(() => {
      const msg = "Sua empresa possui pendências que podem levar ao bloqueio. Procure o administrador do sistema.";
      showInfoModal(msg, support);
      localStorage.removeItem(key);
      schedulePendingReminder(support);
    }, 10 * 60 * 1000);
  }

  function showInfoModal(message: string, support?: string) {
    const el = document.createElement("div");
    const supportHtml = support ? `<div style=\"margin-top:8px;font-size:14px;color:#334155\"><b>Suporte:</b> ${support}<br/><b>Horário:</b> 08:00 às 18:00 (seg-sex), 08:00 às 12:00 (sáb-dom)</div>` : "";
    el.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999">\
      <div style=\"background:#fff;padding:16px;border-radius:8px;max-width:460px;width:90%\">\
        <h3 style=\"margin:0 0 8px 0;font-size:18px;font-weight:600\">Aviso</h3>\
        <div style=\"font-size:14px;color:#334155\">${message}</div>\
        ${supportHtml}\
        <div style=\"margin-top:12px;display:flex;justify-content:flex-end;gap:8px\">\
          <button id=\"info-ok\" style=\"padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc\">Ok</button>\
        </div>\
      </div>\
    </div>`;
    document.body.appendChild(el);
    const ok = el.querySelector('#info-ok') as HTMLButtonElement | null;
    ok?.addEventListener('click', () => { document.body.removeChild(el); });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc]/0 to-[#fff]/0">
      <div className="w-full max-w-5xl mx-6 md:mx-12 grid md:grid-cols-2 gap-12 items-center">
        <section className="px-4 md:px-8 lg:px-16">
          <div className="max-w-lg text-left">
            <AppBrand />
          </div>
        </section>

        <section className="flex items-center justify-center">
          <Card className="w-full max-w-md shadow-lg border border-gray-100/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="inline-flex p-2 rounded-md bg-gradient-to-br from-[#fff7f0] to-[#fff1e6] text-[#b85b00]">
                  <Lock className="w-5 h-5" />
                </span>
                Entrar no BComandas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="document"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF, CNPJ ou email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Digite seu email, cnpj ou cpf"
                            value={docType === "email" ? field.value : formatDocumentByType(docType, field.value)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setTypedValue(raw);
                              field.onChange(raw);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Sua senha" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#ff7a18] to-[#ffb86b] text-white"
                    loading={form.formState.isSubmitting}
                    loadingText="Entrando..."
                  >
                    Entrar
                  </Button>
                </form>
              </Form>

              <div className="mt-4 text-center text-sm text-slate-500">
                Esqueceu a senha? <ForgotPasswordTrigger currentValue={form.getValues("document")} docType={docType} />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function ForgotPasswordTrigger({ currentValue, docType }: { currentValue: string; docType: DocType }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[#b85b00] hover:underline">Recuperar senha</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recuperar senha</DialogTitle>
        </DialogHeader>
        <ForgotPasswordForm onClose={() => setOpen(false)} initialValue={currentValue} initialDocType={docType} />
      </DialogContent>
    </Dialog>
  );
}

function ForgotPasswordForm({ onClose, initialValue, initialDocType }: { onClose: () => void; initialValue: string; initialDocType: DocType }) {
  const [value, setValue] = useState(initialValue || "");
  const [loading, setLoading] = useState(false);
  const dt = detectDocType(value);

  const submit = async () => {
    try {
      setLoading(true);
      const data: ForgotPasswordResponse = await forgotPassword({ docType: "email", document: value.trim() });
      if (!data.success) throw new Error(data.message || "Erro");
      toast.success(data.message || "Se existir uma conta, enviamos instruções para redefinir a senha.");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao solicitar redefinição");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label htmlFor="doc" className="text-sm font-medium">Digite seu login de acesso!</label>
      <Input id="doc" value={value} onChange={(e) => setValue(e.target.value)} />
      <Button onClick={submit} loading={loading} loadingText="Enviando..." className="w-full bg-gradient-to-r from-[#ff7a18] to-[#ffb86b] text-white">
        Enviar instruções
      </Button>
    </div>
  );
}

