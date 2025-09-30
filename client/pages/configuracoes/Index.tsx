import React, { useEffect, useState } from "react";
import * as Admin from "@/services/admin/api";
import { getCurrentUser } from "@/services/auth/api";

export default function ConfiguracoesPage() {
  const me = getCurrentUser() as any;
  const tenantId = me?.tenantId || me?.tenant?.id;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      if (tenantId) {
        setItems(await Admin.listTenantUsers(String(tenantId)));
      } else {
        setItems(await Admin.listUsers());
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const payload: any = Object.fromEntries(fd.entries());
    // normalizações
    payload.cpf = onlyDigits(payload.cpf);
    payload.phone = onlyDigits(payload.phone);
    if (editing?.id) await Admin.updateUser(editing.id, payload); else await Admin.createUser(payload);
    setEditing(null);
    await load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Configurações • Usuários</h2>
        <button className="px-3 py-2 border rounded" onClick={() => setEditing({ role: "WAITER" })}>Novo usuário</button>
      </div>

      {loading ? (
        <div className="rounded-lg border p-6">Carregando...</div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Nome</th>
                <th className="p-2">Email</th>
                <th className="p-2">Acesso</th>
                <th className="p-2">CPF</th>
                <th className="p-2">Telefone</th>
                <th className="p-2">Papel</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.acesso}</td>
                  <td className="p-2">{maskCPF(u.cpf || "")}</td>
                  <td className="p-2">{maskPhone(u.phone || "")}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2 flex gap-2">
                    <button className="px-2 py-1 border rounded" onClick={() => setEditing(u)}>Editar</button>
                    <button className="px-2 py-1 border rounded text-red-600" onClick={async () => { if (confirm("Excluir?")) { await Admin.deleteUser(u.id); await load(); } }}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <form className="bg-white rounded-lg p-4 w-full max-w-2xl space-y-3" onSubmit={handleSave}>
            <div className="text-lg font-semibold">{editing.id ? "Editar usuário" : "Novo usuário"}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input name="name" placeholder="Nome" defaultValue={editing.name} className="w-full border rounded p-2" />
              <input name="email" placeholder="Email" defaultValue={editing.email} className="w-full border rounded p-2" />
              <input name="acesso" placeholder="Acesso (login)" defaultValue={editing.acesso} className="w-full border rounded p-2" />
              <input name="cpf" placeholder="CPF" defaultValue={editing.cpf} className="w-full border rounded p-2" onInput={(e: any) => { e.target.value = maskCPF(e.target.value); }} />
              <input name="phone" placeholder="Telefone" defaultValue={editing.phone} className="w-full border rounded p-2" onInput={(e: any) => { e.target.value = maskPhone(e.target.value); }} />
              <input name="address" placeholder="Endereço" defaultValue={editing.address} className="w-full border rounded p-2 md:col-span-2" />
              <select name="role" defaultValue={editing.role || "WAITER"} className="w-full border rounded p-2">
                <option value="ADMIN">Administrador</option>
                <option value="CASHIER">Caixa</option>
                <option value="WAITER">Atendente</option>
              </select>
              {!editing.id && (<input name="password" type="password" placeholder="Senha inicial" className="w-full border rounded p-2" />)}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 border rounded" onClick={() => setEditing(null)}>Cancelar</button>
              <button type="submit" className="px-3 py-2 border rounded bg-black text-white">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function onlyDigits(v: string) { return (v || "").replace(/\D+/g, ""); }
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
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}


