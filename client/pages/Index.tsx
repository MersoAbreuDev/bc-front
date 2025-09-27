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
import { login, forgotPassword } from "@/services/auth";
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
      if (!data.success) throw new Error(data.message || "Erro ao entrar");
      toast.success("Bem-vindo ao BComandas!");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Falha no login");
    }
  };

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

                  <Button type="submit" className="w-full bg-gradient-to-r from-[#ff7a18] to-[#ffb86b] text-white">
                    Entrar
                  </Button>
                </form>
              </Form>

              <div className="mt-4 text-center text-sm text-slate-500">
                Esqueceu a senha? <ForgotPasswordTrigger />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function ForgotPasswordTrigger() {
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
        <ForgotPasswordForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ForgotPasswordForm({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const dt = detectDocType(value);

  const submit = async () => {
    try {
      setLoading(true);
      const data: ForgotPasswordResponse = await forgotPassword({
        docType: dt,
        document: dt === "email" ? value.trim() : onlyDigits(value),
      });
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
      <FormLabel htmlFor="doc">{dt.toUpperCase()}</FormLabel>
      <Input
        id="doc"
        placeholder={dt === "email" ? "email@example.com" : "000.000.000-00 ou 00.000.000/0000-00"}
        value={dt === "email" ? value : formatDocumentByType(dt, value)}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button onClick={submit} disabled={loading} className="w-full bg-gradient-to-r from-[#ff7a18] to-[#ffb86b] text-white">
        {loading ? "Enviando..." : "Enviar instruções"}
      </Button>
    </div>
  );
}

