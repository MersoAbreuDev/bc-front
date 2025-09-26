import React, { useEffect, useState } from "react";
import BackButton from "@/components/common/BackButton";
import ProductForm from "@/components/common/ProductForm";
import * as ProdutosService from "@/services/produtos";
import { Trash2 } from "lucide-react";
import { listCategories } from "@/services/categoria";
import { listComandas } from "@/services/comanda";
import { toast } from "sonner";

export default function ProdutosPage() {
  const [items, setItems] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Array<any>>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, topProduct: null as null | { name: string; qty: number } });

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [prodsRes, catsRes, comRes] = await Promise.allSettled([
        ProdutosService.listProducts(),
        listCategories(),
        listComandas(),
      ]);

      const list = prodsRes.status === "fulfilled" ? (prodsRes.value || []) : [];
      if (prodsRes.status === "rejected") toast.error(prodsRes.reason?.message || "Falha ao listar produtos");
      setItems(list);
      setPage(1);

      const cats = catsRes.status === "fulfilled" ? (catsRes.value || []) : [];
      if (catsRes.status === "rejected") toast.warning(catsRes.reason?.message || "Falha ao listar categorias");
      setCategories(cats);

      // compute stats
      const total = list.length;
      const active = list.filter((p) => p.active !== false).length;

      // compute most sold from comandas (se disponível)
      let top: null | { name: string; qty: number } = null;
      if (comRes.status === "fulfilled") {
        const comandas = comRes.value || [];
        const salesMap: Record<string, number> = {};
        comandas.forEach((c: any) => c.items.forEach((it: any) => { salesMap[it.productId] = (salesMap[it.productId] || 0) + (it.qty || 0); }));
        Object.keys(salesMap).forEach((pid) => {
          const qty = salesMap[pid];
          const prod = list.find((x: any) => x.id === pid);
          const name = prod ? prod.name : pid;
          if (!top || qty > top.qty) top = { name, qty };
        });
      }

      setStats({ total, active, topProduct: top });

    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este produto?")) return;
    try {
      const resp = await ProdutosService.deleteProduct(id).catch(() => ({ success: true }));
      if (resp.success) setItems((s) => s.filter((x) => x.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleSaved = (p: any) => {
    setItems((s) => {
      const found = s.find((x) => x.id === p.id);
      if (found) return s.map((x) => (x.id === p.id ? p : x));
      return [p, ...s];
    });
    // refresh stats
    setTimeout(() => load(), 200);
  };

  const getCategoryName = (id?: string) => categories.find((c) => c.id === id)?.name || "--";

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <BackButton to="/dashboard" />
        <h2 className="text-2xl font-bold">Produtos</h2>
        <ProductForm onSaved={handleSaved} />
      </div>

      {loading ? (
        <div>
          {/* Dashboard skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Produtos ativos</div>
              <div className="h-8 w-24 mt-2 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Total de produtos</div>
              <div className="h-8 w-24 mt-2 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Produto mais vendido</div>
              <div className="h-6 w-full mt-2 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>

          {/* Table skeleton */}
          <div className="hidden md:block">
            <div className="w-full border-collapse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-3 border-t">
                  <div className="h-6 bg-gray-200 animate-pulse rounded w-3/4" />
                </div>
              ))}
            </div>
          </div>

          {/* Mobile skeleton */}
          <div className="md:hidden space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="h-6 bg-gray-200 animate-pulse rounded w-1/2" />
                <div className="h-4 bg-gray-200 animate-pulse rounded w-1/3 mt-2" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Produtos ativos</div>
              <div className="text-2xl font-bold">{stats.active}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Total de produtos</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Produto mais vendido</div>
              <div className="text-lg font-medium">{stats.topProduct ? `${stats.topProduct.name} (${stats.topProduct.qty})` : "-"}</div>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="p-3">Nome</th>
                  <th className="p-3">Preço</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.slice((page - 1) * pageSize, page * pageSize).map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{p.name}</td>
                    <td className="p-3">R$ {Number(p.price).toFixed(2)}</td>
                    <td className="p-3">{getCategoryName(p.categoryId)}</td>
                    <td className="p-3">{p.active === false ? <span className="text-red-600">Inativo</span> : <span className="text-green-600">Ativo</span>}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <ProductForm item={p} onSaved={handleSaved} />
                        <button onClick={() => handleDelete(p.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination for desktop */}
          <div className="hidden md:flex items-center gap-2 mt-3 justify-center">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded">Anterior</button>
            <div className="flex gap-1">
              {Array.from({ length: Math.max(1, Math.ceil(items.length / pageSize)) }).map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`px-2 py-1 rounded ${page === i + 1 ? 'bg-gray-200' : 'border'}`}>{i + 1}</button>
              ))}
            </div>
            <button onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(items.length / pageSize)), p + 1))} className="px-3 py-1 border rounded">Próxima</button>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {items.slice((page - 1) * pageSize, page * pageSize).map((p) => (
              <div key={p.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-muted-foreground">R$ {Number(p.price).toFixed(2)} • {getCategoryName(p.categoryId)} • {p.active === false ? 'Inativo' : 'Ativo'}</div>
                  </div>
                  <div className="flex gap-2">
                    <ProductForm item={p} onSaved={handleSaved} />
                    <button onClick={() => handleDelete(p.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* mobile pagination */}
            <div className="flex items-center gap-2 justify-center">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded">Anterior</button>
              <div className="flex gap-1 overflow-auto">
                {Array.from({ length: Math.max(1, Math.ceil(items.length / pageSize)) }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)} className={`px-2 py-1 rounded ${page === i + 1 ? 'bg-gray-200' : 'border'}`}>{i + 1}</button>
                ))}
              </div>
              <button onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(items.length / pageSize)), p + 1))} className="px-3 py-1 border rounded">Próxima</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
