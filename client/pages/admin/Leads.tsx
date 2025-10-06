import React, { useEffect, useState } from "react";
import * as Admin from "@/services/admin/api";
import { Button } from "@/components/ui/button";

export default function AdminLeadsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await Admin.listLeads()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    await Admin.approveLead(id);
    await load();
  };
  const reject = async (id: string) => {
    const reason = prompt("Motivo da rejeição (opcional)") || undefined;
    setRejecting(id);
    try { await Admin.rejectLead(id, reason); } finally { setRejecting(null); }
    await load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Leads (Captação)</h2>
      </div>
      {loading ? (
        <div className="rounded-lg border p-6">Carregando...</div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left">
                <th className="p-2">Data</th>
                <th className="p-2">Empresa</th>
                <th className="p-2">CNPJ</th>
                <th className="p-2">Responsável</th>
                <th className="p-2">Contato</th>
                <th className="p-2">Status</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{l.createdAt ? new Date(l.createdAt).toLocaleString() : '-'}</td>
                  <td className="p-2">{l.company?.tradeName || l.company?.corporateName || '-'}</td>
                  <td className="p-2">{l.company?.cnpj || '-'}</td>
                  <td className="p-2">{l.responsible?.name || '-'}</td>
                  <td className="p-2">{l.responsible?.email || ''}{l.responsible?.phone ? ` • ${l.responsible.phone}` : ''}</td>
                  <td className="p-2">{(l.status || 'pending').toUpperCase()}</td>
                  <td className="p-2 flex gap-2">
                    <Button variant="outline" onClick={() => approve(l.id)}>Aprovar</Button>
                    <Button variant="destructive" onClick={() => reject(l.id)} loading={rejecting===l.id} loadingText="Rejeitando...">Rejeitar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


