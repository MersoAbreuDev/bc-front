import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CaptacaoPage() {
  // Responsável
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [responsavelAddress, setResponsavelAddress] = useState("");
  // Empresa
  const [company, setCompany] = useState(""); // nome fantasia
  const [corporateName, setCorporateName] = useState(""); // razão social
  const [cnpj, setCnpj] = useState("");
  const [ie, setIe] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [industry, setIndustry] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leadsUrl = (import.meta as any)?.env?.VITE_LEADS_URL || "https://api.bcomandas.com.br/leads";

  function onlyDigits(v: string) { return (v || "").replace(/\D+/g, ""); }
  function maskCNPJ(v: string) {
    const d = onlyDigits(v).slice(0, 14);
    return d
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  function maskPhone(v: string) {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 10) {
      return d
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const res = await fetch(String(leadsUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "landing-captacao",
          // responsável
          responsible: {
            name,
            email,
            phone,
            address: responsavelAddress,
          },
          // empresa
          company: {
            tradeName: company,
            corporateName,
            cnpj,
            stateRegistration: ie,
            address: companyAddress,
            industry,
          },
        }),
      });
      if (!res.ok) {
        const jd: any = await (async () => { try { return await res.json(); } catch { return undefined; } })();
        throw new Error(jd?.message || `Erro ${res.status}`);
      }
      setSent(true);
    } catch (e: any) {
      setError(e?.message || "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fff7f0]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          <div className="text-3xl md:text-4xl font-extrabold tracking-tight">BComandas</div>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">Gestão simples e eficiente de comandas, produtos e caixa — tudo em um só lugar.</p>
        </header>

        <section className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Por que o BComandas?</h2>
              <ul className="mt-3 list-disc list-inside text-slate-600 space-y-1">
                <li>Controle de comandas em tempo real</li>
                <li>Cadastro de produtos e categorias</li>
                <li>Gestão de caixa com abertura, movimentação e fechamento</li>
                <li>Relatórios para tomada de decisão</li>
                <li>Acesso multiusuário com perfis</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium">Como funciona o teste</h3>
              <p className="mt-2 text-slate-600">Preencha seus dados. Entraremos em contato e liberaremos um acesso gratuito de avaliação.</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              {sent ? (
                <div className="text-center py-10">
                  <div className="text-xl font-semibold">Obrigado!</div>
                  <p className="mt-2 text-slate-600">Recebemos seus dados e em breve entraremos em contato para liberar o acesso de teste.</p>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={onSubmit}>
                  <div className="text-sm font-semibold">Dados da empresa</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm font-medium">CNPJ</div>
                      <Input placeholder="00.000.000/0000-00" inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">I.E.</div>
                      <Input placeholder="Inscrição Estadual" value={ie} onChange={(e) => setIe(e.target.value)} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Razão Social</div>
                      <Input placeholder="Razão Social" value={corporateName} onChange={(e) => setCorporateName(e.target.value)} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Nome Fantasia</div>
                      <Input placeholder="Nome Fantasia" value={company} onChange={(e) => setCompany(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium">Endereço (empresa)</div>
                      <Input placeholder="Rua, número, bairro, cidade - UF" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium">Ramo de atuação</div>
                      <Input placeholder="Ex.: Restaurante, Bar, Lanchonete" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                    </div>
                  </div>

                  <div className="pt-2 text-sm font-semibold">Dados do responsável</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm font-medium">Nome completo</div>
                      <Input placeholder="Nome do responsável" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Email</div>
                      <Input type="email" placeholder="responsavel@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Telefone</div>
                      <Input placeholder="(00) 00000-0000" inputMode="numeric" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium">Endereço (responsável)</div>
                      <Input placeholder="Rua, número, bairro, cidade - UF" value={responsavelAddress} onChange={(e) => setResponsavelAddress(e.target.value)} />
                    </div>
                  </div>
                  {error && <div className="text-sm text-red-600">{error}</div>}
                  <Button type="submit" className="w-full" loading={sending} loadingText="Enviando...">Quero testar grátis</Button>
                  <div className="text-xs text-slate-500 text-center">Ao enviar, você concorda em ser contatado para ativação do teste.</div>
                </form>
              )}
            </CardContent>
          </Card>
        </section>

        <footer className="mt-16 text-center text-xs text-slate-500">© {new Date().getFullYear()} BComandas. Todos os direitos reservados.</footer>
      </div>
    </div>
  );
}


