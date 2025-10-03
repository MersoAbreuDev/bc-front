import React, { useEffect, useState } from "react";
import * as Admin from "@/services/admin/api";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { Button } from "@/components/ui/button";

const STATUS = ["active","suspended","blocked","pending"];
const PLAN = ["free","basic","premium","enterprise"];

export default function AdminTenantsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showUsersOf, setShowUsersOf] = useState<any | null>(null);
  const [usersOf, setUsersOf] = useState<any[]>([]);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const load = async () => { setLoading(true); try { setItems(await Admin.listTenants()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const handleSave = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setSaving(true);
    const fd = new FormData(ev.currentTarget);
    const payload: any = Object.fromEntries(fd.entries());

    // Normalizações: números e documentos
    const onlyDigits = (v: any) => String(v || "").replace(/\D+/g, "");
    if (payload.cnpj !== undefined) payload.cnpj = onlyDigits(payload.cnpj);
    if (payload.phone !== undefined) payload.phone = onlyDigits(payload.phone);
    if (payload.adminCpf !== undefined) payload.adminCpf = onlyDigits(payload.adminCpf);
    if (payload.adminPhone !== undefined) payload.adminPhone = onlyDigits(payload.adminPhone);
    if (payload.monthlyFee !== undefined) {
      const cents = Number(String(payload.monthlyFee).replace(/\D+/g, ""));
      payload.monthlyFee = Number((cents / 100).toFixed(2));
    }

    // No cadastro inicial, o acesso do admin deve ser o CNPJ
    // Não enviar campos de acesso via front
    delete payload.acesso;
    delete payload.adminAcesso;
    // NUNCA enviar senha do admin pelo front
    delete payload.adminPassword;

    // Upload de logo: prioriza arquivo -> logoBase64
    const file = fd.get("logoFile") as File | null;
    // Remover campos não definidos no DTO (ValidationPipe whitelist)
    delete payload.logoFile;
    delete payload.nextPaymentDate;
    let saved: any;
    if (editing?.id) {
      saved = await Admin.updateTenant(editing.id, payload);
    } else {
      // usa o endpoint de registro combinado
      saved = await Admin.registerTenant(payload);
    }
    // upload do logo separado, se houver arquivo
    try {
      if (file && file.size > 0) {
        const tenantId = (editing?.id) ? editing.id : (saved?.id || saved?.tenant?.id);
        if (tenantId) {
          await Admin.uploadTenantLogo(tenantId, file);
        }
      }
    } catch { /* ignore upload error */ }

    setEditing(null);
    await load();
    setSaving(false);
  };

  const openUsersModal = async (tenant: any) => {
    setShowUsersOf(tenant);
    try { setUsersOf(await Admin.listTenantUsers(tenant.id)); } catch { setUsersOf([]); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Tenants</h2>
        <Button onClick={() => setEditing({})}>Novo</Button>
      </div>
      {loading ? (
        <div className="rounded-lg border p-6">Carregando...</div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Slug</th>
                <th className="p-2">Nome</th>
                <th className="p-2">Status</th>
                <th className="p-2">Plano</th>
                <th className="p-2">Mensalidade</th>
                <th className="p-2">Próx. Pagto</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2">{t.slug}</td>
                  <td className="p-2">{t.name}</td>
                  <td className="p-2">{t.status}</td>
                  <td className="p-2">{t.plan}</td>
                  <td className="p-2">{t.monthlyFee}</td>
                  <td className="p-2">{t.nextPaymentDate}</td>
                  <td className="p-2 flex gap-2">
                    <Button variant="outline" onClick={() => setEditing(t)}>Editar</Button>
                    <Button variant="ghost" onClick={() => openUsersModal(t)}>Usuários</Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const ok = await confirm({ title: "Excluir tenant", description: `Confirma a exclusão de ${t.name}?`, confirmText: "Excluir", cancelText: "Cancelar" });
                        if (!ok) return;
                        await Admin.deleteTenant(t.id);
                        await load();
                      }}
                    >Excluir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <form className="bg-white rounded-lg p-4 w-full max-w-5xl max-h-[80vh] overflow-auto" onSubmit={handleSave}>
            <div className="text-lg font-semibold mb-3">{editing.id ? "Editar tenant" : "Novo tenant"}</div>

            {/* Linha 1: básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <input name="slug" placeholder="slug" defaultValue={editing.slug} className="w-full border rounded p-2" />
              <input name="name" placeholder="Nome" defaultValue={editing.name} className="w-full border rounded p-2" />
              <select name="status" defaultValue={editing.status || "pending"} className="w-full border rounded p-2">
                {STATUS.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
              <select name="plan" defaultValue={editing.plan || "free"} className="w-full border rounded p-2">
                {PLAN.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
              <input name="monthlyFee" inputMode="numeric" placeholder="Mensalidade (R$)" defaultValue={formatBRL(editing.monthlyFee)} className="w-full border rounded p-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" onInput={(e: any) => { e.target.value = maskBRL(e.target.value); }} />
              <input name="nextPaymentDate" type="date" placeholder="Próximo pagto" defaultValue={editing.nextPaymentDate?.slice?.(0,10)} className="w-full border rounded p-2" />
            </div>

            {/* Linha 2: contato/identificação */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              <input name="email" placeholder="Email" defaultValue={editing.email} className="w-full border rounded p-2" />
              <input name="phone" placeholder="Telefone" defaultValue={editing.phone} className="w-full border rounded p-2" onInput={(e: any) => { e.target.value = maskPhone(e.target.value); }} />
              <input name="cnpj" placeholder="CNPJ" defaultValue={editing.cnpj} className="w-full border rounded p-2" onInput={(e: any) => { e.target.value = maskCNPJ(e.target.value); }} />
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input name="logoUrl" placeholder="Logo URL (opcional)" defaultValue={editing.logoUrl} className="w-full border rounded p-2" />
                <div>
                  <label className="text-sm text-muted-foreground">Logo (upload)</label>
                  <input name="logoFile" type="file" accept="image/*" className="w-full border rounded p-2" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) { setLogoPreview(""); return; }
                    const reader = new FileReader();
                    reader.onload = () => setLogoPreview(String(reader.result || ""));
                    reader.readAsDataURL(f);
                  }} />
                </div>
                {logoPreview && (
                  <div className="col-span-full">
                    <div className="text-xs text-muted-foreground mb-1">Pré-visualização</div>
                    <img src={logoPreview} alt="logo preview" className="h-16 object-contain" />
                  </div>
                )}
              </div>
            </div>

            {/* Linha 3: corporativo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              <input name="corporateName" placeholder="Razão social" defaultValue={editing.corporateName} className="w-full border rounded p-2" />
              <input name="tradeName" placeholder="Nome fantasia" defaultValue={editing.tradeName} className="w-full border rounded p-2" />
              <input name="stateRegistration" placeholder="Inscrição estadual" defaultValue={editing.stateRegistration} className="w-full border rounded p-2" />
              <input name="commercialAddress" placeholder="Endereço comercial" defaultValue={editing.commercialAddress} className="w-full border rounded p-2 lg:col-span-2" />
              <div>
                <label className="text-sm text-muted-foreground">Início assinatura</label>
                <input name="subscriptionStartDate" type="date" defaultValue={editing.subscriptionStartDate?.slice?.(0,10)} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Fim assinatura</label>
                <input name="subscriptionEndDate" type="date" defaultValue={editing.subscriptionEndDate?.slice?.(0,10)} className="w-full border rounded p-2" />
              </div>
            </div>

            {/* Observações */}
            <div className="mt-3">
              <textarea name="notes" placeholder="Observações" defaultValue={editing.notes} className="w-full border rounded p-2 min-h-20" />
            </div>

            {/* Admin (somente no cadastro). Senha não é mais enviada; acesso será o CNPJ */}
            {!editing.id && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Administrador da empresa</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <input name="adminName" placeholder="Nome do admin" className="w-full border rounded p-2" />
                  <input name="adminEmail" placeholder="Email do admin" className="w-full border rounded p-2" />
                  <input name="adminCpf" placeholder="CPF do admin" className="w-full border rounded p-2" onInput={(e: any) => { e.target.value = maskCPF(e.target.value); }} />
                  <input name="adminPhone" placeholder="Telefone do admin" className="w-full border rounded p-2" onInput={(e: any) => { e.target.value = maskPhone(e.target.value); }} />
                  <input name="adminAddress" placeholder="Endereço do admin" className="w-full border rounded p-2 lg:col-span-2" />
                </div>
                <div className="text-xs text-muted-foreground mt-2">O login de acesso do admin será definido automaticamente como o CNPJ informado.</div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" loading={saving} loadingText="Salvando...">Salvar</Button>
            </div>
          </form>
        </div>
      )}

      {showUsersOf && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Usuários de {showUsersOf.name}</div>
              <button className="px-2 py-1 border rounded" onClick={() => setShowUsersOf(null)}>Fechar</button>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">Nome</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Acesso</th>
                    <th className="p-2">Papel</th>
                  </tr>
                </thead>
                <tbody>
                  {usersOf.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-2">{u.name}</td>
                      <td className="p-2">{u.email}</td>
                      <td className="p-2">{u.acesso}</td>
                      <td className="p-2">{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers de máscara e formatação
function onlyDigits(v: string) { return (v || "").replace(/\D+/g, ""); }
function maskCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
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
function maskBRL(v: string) {
  const n = onlyDigits(v);
  const cents = n === "" ? 0 : parseInt(n, 10);
  const num = cents / 100;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatBRL(n: any) {
  const num = Number(n || 0);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}


