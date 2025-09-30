import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as Admin from "@/services/admin/api";

export default function AdminHome() {
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [u, t] = await Promise.all([
          Admin.listUsers().catch(() => []),
          Admin.listTenants().catch(() => []),
        ]);
        setUsers(u);
        setTenants(t);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Administração</h2>
      {loading ? (
        <div className="rounded-lg border p-6">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Usuários</div>
              <Link to="/admin/usuarios" className="text-sm underline">gerenciar</Link>
            </div>
            <div className="text-sm text-muted-foreground mb-2">Últimos usuários</div>
            <ul className="text-sm space-y-1 max-h-64 overflow-auto">
              {users.slice(0, 10).map((u) => (
                <li key={u.id} className="border-b py-1">{u.name || u.email || u.acesso} — {u.role}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Empresas (Tenants)</div>
              <Link to="/admin/tenants" className="text-sm underline">gerenciar</Link>
            </div>
            <div className="text-sm text-muted-foreground mb-2">Últimos tenants</div>
            <ul className="text-sm space-y-1 max-h-64 overflow-auto">
              {tenants.slice(0, 10).map((t) => (
                <li key={t.id} className="border-b py-1">{t.name} — {t.status} / {t.plan}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}


