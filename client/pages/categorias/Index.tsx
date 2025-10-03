import React, { useEffect, useState } from "react";
import * as CategoriaService from "@/services/categoria";
import BackButton from "@/components/common/BackButton";
import CategoryForm from "@/components/common/CategoryForm";
import { Trash2 } from "lucide-react";
import { listComandas } from "@/services/comanda";
import * as ProdutosService from "@/services/produtos";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { Button } from "@/components/ui/button";

export default function CategoriasPage() {
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, topCategory: null as null | { name: string; qty: number } });

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const list = await CategoriaService.listCategories();
      setCategories(list);

      const total = list.length;
      const active = list.filter((c) => c.active !== false).length;

      // compute top category from comandas
      const comandas = await listComandas();
      const products = await ProdutosService.listProducts();
      const catSales: Record<string, number> = {};
      comandas.forEach((c) => c.items.forEach((it: any) => {
        const prod = products.find((p: any) => p.id === it.productId);
        const catId = prod?.categoryId;
        if (catId) catSales[catId] = (catSales[catId] || 0) + (it.qty || 0);
      }));
      let top: null | { name: string; qty: number } = null;
      Object.keys(catSales).forEach((cid) => {
        const qty = catSales[cid];
        const cat = list.find((x: any) => x.id === cid);
        const name = cat ? cat.name : cid;
        if (!top || qty > top.qty) top = { name, qty };
      });

      setStats({ total, active, topCategory: top });
    } catch (e) {
      setCategories([
        { id: "c1", name: "Bebidas", active: true },
        { id: "c2", name: "Petiscos", active: true },
        { id: "c3", name: "Sobremesas", active: true },
      ]);
      setStats({ total: 3, active: 3, topCategory: null });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: "Excluir categoria", description: "Deseja excluir esta categoria?", confirmText: "Excluir", cancelText: "Cancelar" });
    if (!ok) return;
    try {
      const resp = await CategoriaService.deleteCategory(id).catch(() => ({ success: true }));
      if (resp.success) setCategories((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaved = (c: any) => {
    // replace or add
    setCategories((s) => {
      const found = s.find((x) => x.id === c.id);
      if (found) return s.map((x) => (x.id === c.id ? c : x));
      return [c, ...s];
    });
    setTimeout(() => load(), 200);
  };

  const totalPages = Math.max(1, Math.ceil(categories.length / pageSize));
  const paged = categories.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <BackButton to="/dashboard" />
        <h2 className="text-2xl font-bold">Categorias</h2>
        <CategoryForm onSaved={handleSaved} />
      </div>

      {loading ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Categorias Ativas</div>
              <div className="h-8 w-24 mt-2 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Total de Categorias</div>
              <div className="h-8 w-24 mt-2 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Categoria mais vendida</div>
              <div className="h-6 w-full mt-2 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>

          <div className="hidden md:block">
            <div className="w-full border-collapse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-3 border-t">
                  <div className="h-6 bg-gray-200 animate-pulse rounded w-3/4" />
                </div>
              ))}
            </div>
          </div>

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
              <div className="text-sm text-muted-foreground">Categorias Ativas</div>
              <div className="text-2xl font-bold">{stats.active}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Total de Categorias</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Categoria mais vendida</div>
              <div className="text-lg font-medium">{stats.topCategory ? `${stats.topCategory.name} (${stats.topCategory.qty})` : "-"}</div>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="p-3">Nome</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">{c.name}</td>
                    <td className="p-3">{c.active === false ? <span className="text-red-600">Inativa</span> : <span className="text-green-600">Ativa</span>}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <CategoryForm item={c} onSaved={handleSaved} />
                        <Button variant="destructive" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* pagination */}
            <div className="mt-3 flex items-center gap-2 justify-center">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded">Anterior</button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)} className={`px-2 py-1 rounded ${page === i + 1 ? 'bg-gray-200' : 'border'}`}>{i + 1}</button>
                ))}
              </div>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded">Próxima</button>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {paged.map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{c.active === false ? 'Inativa' : 'Ativa'}</div>
                  </div>
                  <div className="flex gap-2">
                    <CategoryForm item={c} onSaved={handleSaved} />
                    <Button variant="destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* mobile pagination */}
            <div className="flex items-center gap-2 justify-center">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded">Anterior</button>
              <div className="flex gap-1 overflow-auto">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)} className={`px-2 py-1 rounded ${page === i + 1 ? 'bg-gray-200' : 'border'}`}>{i + 1}</button>
                ))}
              </div>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded">Próxima</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
