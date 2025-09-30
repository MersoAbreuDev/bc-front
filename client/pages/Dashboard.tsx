import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/services/auth/api";
import { Link } from "react-router-dom";
import DashboardCard from "@/components/common/DashboardCard";
import Skeleton from "@/components/ui/skeleton";
import { DollarSign, ClipboardList, Layers, PlusSquare, List, BarChart2 } from "lucide-react";
import * as CaixaService from "@/services/caixa";
import * as ComandaService from "@/services/comanda";
import * as CategoriaService from "@/services/categoria";

export default function Dashboard() {
  const [caixa, setCaixa] = useState<any | null>(null);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [salesTotal, setSalesTotal] = useState<number>(0);
  const [categoriesCount, setCategoriesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const role = String(getCurrentUser()?.role || '').toUpperCase();

  // Mock fallback values in case services return nothing
  const mock = {
    salesToday: 1345.5,
    totalComandas: 18,
    totalCategories: 6,
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [c, com, cats] = await Promise.all([
          CaixaService.getOpenCashRemote().then(r => (r.success ? r.data : null)).catch(() => null),
          ComandaService.getActiveComandas().catch(() => Array.from({ length: mock.totalComandas })),
          CategoriaService.listCategories().catch(() => Array.from({ length: mock.totalCategories })),
        ]);
        if (!mounted) return;
        setCaixa(c as any);
        if (c?.id) {
          const sum = await CaixaService.getCashSummaryRemote(c.id).catch(() => null);
          if (sum && sum.success && sum.data) {
            setSalesTotal(Number(sum.data.salesTotal || 0));
          }
        } else {
          setSalesTotal(0);
        }
        setActiveCount((com || []).length ?? mock.totalComandas);
        setCategoriesCount((cats || []).length ?? mock.totalCategories);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const salesValue = Number(salesTotal || 0);

  return (
    <div className="p-6 md:p-10">
      <header className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <div className="text-sm text-muted-foreground mt-1">Visão geral do sistema e acessos rápidos</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">Bem-vindo, {getCurrentUser()?.name || "operador"}</div>
        </div>
      </header>

      <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-8">
        {(role === 'ADMIN' || role === 'MASTER') && (
          <DashboardCard
            title="Vendas do dia"
            value={`R$ ${salesValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={<DollarSign className="w-5 h-5" />}
            color="bg-[#fff7f0] text-[#b85b00]"
            stacked
          >
            {loading ? <Skeleton className="w-24" /> : "Total de vendas processadas hoje"}
          </DashboardCard>
        )}

        <DashboardCard
          title="Comandas ativas"
          value={activeCount}
          icon={<ClipboardList className="w-5 h-5" />}
          color="bg-[#fff7f0] text-[#b85b00]"

        >
          {loading ? <Skeleton className="w-24" /> : "Comandas abertas no momento"}
        </DashboardCard>

        <DashboardCard
          title="Categorias"
          value={categoriesCount}
          icon={<Layers className="w-5 h-5" />}
          color="bg-[#fff7f0] text-[#b85b00]"

        >
          {loading ? <Skeleton className="w-24" /> : "Categorias cadastradas"}
        </DashboardCard>
      </section>

      <section className="mb-8">
        <h3 className="mb-4 text-lg font-semibold">Acessos rápidos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/caixa" className="rounded-lg border p-4 text-center hover:shadow-md flex flex-col items-center gap-2 h-full">
            <div className="p-3 rounded-md bg-[#fff7f0] text-[#b85b00]"><DollarSign className="w-5 h-5" /></div>
            <div className="font-medium">Caixa</div>
          </Link>

          <Link to="/categorias" className="rounded-lg border p-4 text-center hover:shadow-md flex flex-col items-center gap-2 h-full">
            <div className="p-3 rounded-md bg-[#fff7f0] text-[#b85b00]"><Layers className="w-5 h-5" /></div>
            <div className="font-medium">Categorias</div>
          </Link>

          <Link to="/produtos" className="rounded-lg border p-4 text-center hover:shadow-md flex flex-col items-center gap-2 h-full">
            <div className="p-3 rounded-md bg-[#fff7f0] text-[#b85b00]"><PlusSquare className="w-5 h-5" /></div>
            <div className="font-medium">Produtos</div>
          </Link>

          <Link to="/comandas/abrir" className="rounded-lg border p-4 text-center hover:shadow-md flex flex-col items-center gap-2 h-full">
            <div className="p-3 rounded-md bg-[#fff7f0] text-[#b85b00]"><List className="w-5 h-5" /></div>
            <div className="font-medium">Abrir comanda</div>
          </Link>


          <Link to="/relatorios" className="rounded-lg border p-4 text-center hover:shadow-md flex flex-col items-center gap-2 h-full">
            <div className="p-3 rounded-md bg-[#fff7f0] text-[#b85b00]"><BarChart2 className="w-5 h-5" /></div>
            <div className="font-medium">Relatórios</div>
          </Link>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Visão geral</h3>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-lg border p-4 bg-gradient-to-br from-[#fff7f0] to-[#fff1e6] h-56">
            <div className="text-sm text-muted-foreground mb-2">Gráfico de vendas (placeholder)</div>
            {(role === 'ADMIN' || role === 'MASTER') ? (
              <div className="h-full bg-white/60 rounded-md flex items-center justify-center text-sm text-muted-foreground">Gráfico</div>
            ) : (
              <div className="h-full bg-white/60 rounded-md" />
            )}
          </div>
          <div className="rounded-lg border p-4 h-56">
            <div className="text-sm text-muted-foreground mb-2">Notificações</div>
            {(role === 'ADMIN' || role === 'MASTER') ? (
              <ul className="text-sm space-y-2">
                <li className="text-sm">• Caixa com saldo POSITIVO</li>
                <li className="text-sm">• 2 comandas com atraso</li>
              </ul>
            ) : (
              <ul className="text-sm space-y-2" />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
