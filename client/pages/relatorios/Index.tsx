import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis, Cell } from "recharts";
import { format } from "date-fns";
import * as ProdutosService from "@/services/produtos";
import * as CategoriaService from "@/services/categoria";
import * as ComandaService from "@/services/comanda";
import * as CaixaService from "@/services/caixa";

export default function RelatoriosPage() {
  // filtros simples
  const [period, setPeriod] = useState<{ from: string; to: string }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  });
  const [categoryId, setCategoryId] = useState<string | "all">("all");

  // dados
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [comandas, setComandas] = useState<ComandaService.Comanda[]>([]);
  const [cashMovs, setCashMovs] = useState<CaixaService.BackendCashMovement[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [prods, cats, tabs] = await Promise.all([
          ProdutosService.listProducts().catch(() => []),
          CategoriaService.listCategories().catch(() => []),
          ComandaService.listComandas().catch(() => []),
        ]);
        setProducts(prods);
        setCategories(cats);
        setComandas(tabs);

        // tentar buscar caixa aberto e seus movimentos
        const cash = await CaixaService.getOpenCashRemote();
        if (cash.success && cash.data?.id) {
          const movs = await CaixaService.listMovementsRemote(cash.data.id);
          setCashMovs(movs.success && movs.data ? movs.data : []);
        } else {
          setCashMovs([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // helpers
  const categoryName = (id?: string) => categories.find((c: any) => c.id === id)?.name || "-";
  const productById = useMemo(() => new Map(products.map((p: any) => [p.id, p])), [products]);

  const fromDate = useMemo(() => new Date(period.from + "T00:00:00"), [period.from]);
  const toDate = useMemo(() => new Date(period.to + "T23:59:59"), [period.to]);

  // filtrar itens por período e categoria
  const filteredItems = useMemo(() => {
    const allItems = comandas.flatMap((c) => c.items);
    return allItems.filter((it) => {
      const d = new Date(it.data_pedido || cSafeDate());
      if (d < fromDate || d > toDate) return false;
      const prod = productById.get(it.productId);
      if (categoryId !== "all") return prod?.categoryId === categoryId;
      return true;
    });
  }, [comandas, fromDate, toDate, productById, categoryId]);

  // KPIs vendas + por forma de pagamento via endpoint dedicado
  const [salesSummary, setSalesSummary] = useState<{ totalSales: number; countClosed: number; byPayment: Record<string, { total: number; count: number }> } | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const res = await CaixaService.getSalesSummaryPeriod({ from: period.from, to: period.to });
      if (res.success && res.data) {
        const normalizeNum = (v: any) => typeof v === "string" ? Number(v) : Number(v || 0);
        const norm: any = {
          totalSales: normalizeNum(res.data.totalSales),
          countClosed: res.data.countClosed || 0,
          byPayment: Object.fromEntries(Object.entries(res.data.byPayment || {}).map(([k, o]: any) => [k, { total: normalizeNum(o?.total), count: Number(o?.count || 0) }]))
        };
        setSalesSummary(norm);
      } else {
        setSalesSummary(null);
      }
    };
    fetchSummary();
  }, [period.from, period.to]);

  const kpis = useMemo(() => {
    if (salesSummary) {
      const faturamento = salesSummary.totalSales || 0;
      const pedidos = salesSummary.countClosed || 0;
      // itens vendidos não vem do resumo; estimativa a partir dos itens filtrados
      const itensVendidos = filteredItems.reduce((acc, it) => acc + (it.qty || 0), 0);
      const ticketMedio = pedidos ? faturamento / pedidos : 0;
      return { faturamento, itensVendidos, pedidos, ticketMedio };
    }
    // fallback local
    const faturamento = filteredItems.reduce((acc, it) => acc + (it.qty || 0) * (it.price || 0), 0);
    const itensVendidos = filteredItems.reduce((acc, it) => acc + (it.qty || 0), 0);
    const pedidosUnicos = new Set(filteredItems.map((it: any) => it.id?.split(":").shift() || it.id)).size;
    const ticketMedio = pedidosUnicos ? faturamento / pedidosUnicos : 0;
    return { faturamento, itensVendidos, pedidos: pedidosUnicos, ticketMedio };
  }, [filteredItems, salesSummary]);

  // série temporal receita por dia
  const seriesDia = useMemo(() => {
    const map: Record<string, number> = {};
    filteredItems.forEach((it) => {
      const day = format(new Date(it.data_pedido || cSafeDate()), "yyyy-MM-dd");
      map[day] = (map[day] || 0) + (it.qty || 0) * (it.price || 0);
    });
    const days: string[] = enumerateDays(fromDate, toDate);
    return days.map((d) => ({ day: d, total: Number((map[d] || 0).toFixed(2)) }));
  }, [filteredItems, fromDate, toDate]);

  // barras por categoria
  const barrasCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    filteredItems.forEach((it) => {
      const prod = productById.get(it.productId);
      const cid = prod?.categoryId || "_";
      map[cid] = (map[cid] || 0) + (it.qty || 0) * (it.price || 0);
    });
    const entries = Object.entries(map).map(([cid, v]) => ({ name: categoryName(cid), total: Number(v.toFixed(2)) }));
    return entries.sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredItems, productById, categories]);

  // top produtos (pizza)
  const pizzaProdutos = useMemo(() => {
    const map: Record<string, number> = {};
    filteredItems.forEach((it) => {
      const prod = productById.get(it.productId);
      const name = prod?.name || it.productId;
      map[name] = (map[name] || 0) + (it.qty || 0) * (it.price || 0);
    });
    const entries = Object.entries(map).map(([name, v]) => ({ name, value: Number(v.toFixed(2)) }));
    return entries.sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredItems, productById]);

  const pieColors = [
    "#6366F1", // indigo-500
    "#10B981", // emerald-500
    "#F59E0B", // amber-500
    "#EF4444", // red-500
    "#8B5CF6", // violet-500
    "#06B6D4", // cyan-500
    "#84CC16", // lime-500
    "#F43F5E", // rose-500
    "#A78BFA", // violet-400
    "#22D3EE", // cyan-400
  ];

  const barColors = [
    "#0EA5E9", // sky-500
    "#22C55E", // green-500
    "#F97316", // orange-500
    "#E11D48", // rose-600
    "#7C3AED", // violet-600
    "#06B6D4", // cyan-500
    "#65A30D", // lime-600
    "#D946EF", // fuchsia-500
    "#14B8A6", // teal-500
    "#F59E0B", // amber-500
  ];

  // movimentações de caixa
  const movResumo = useMemo(() => {
    const dentroPeriodo = cashMovs.filter((m) => {
      const d = new Date(m.createdAt);
      return d >= fromDate && d <= toDate;
    });
    let totalIn = 0, totalOut = 0;
    dentroPeriodo.forEach((m) => {
      const val = Number(m.amount || 0);
      if (m.type === "exit" || m.type === "cashout") totalOut += val; else totalIn += val;
    });
    return { totalIn, totalOut, balance: totalIn - totalOut, items: dentroPeriodo };
  }, [cashMovs, fromDate, toDate]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Relatórios</h2>
      </div>

      {/* Filtros simples */}
      <div className="rounded-lg border p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-sm text-muted-foreground">De</label>
          <input type="date" value={period.from} onChange={(e) => setPeriod((s) => ({ ...s, from: e.target.value }))} className="mt-1 w-full border rounded p-2" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Até</label>
          <input type="date" value={period.to} onChange={(e) => setPeriod((s) => ({ ...s, to: e.target.value }))} className="mt-1 w-full border rounded p-2" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Categoria</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full border rounded p-2">
            <option value="all">Todas</option>
            {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={() => quickRanges(setPeriod)} className="px-3 py-2 border rounded w-full">Atalhos (7/30 dias)</button>
        </div>
      </div>

      <Tabs defaultValue="vendas" className="w-full">
        <TabsList>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="movs">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="mt-4">
          {loading ? (
            <div className="rounded-lg border p-6">Carregando...</div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Faturamento</div><div className="text-2xl font-bold">R$ {kpis.faturamento.toFixed(2)}</div></div>
                <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Pedidos</div><div className="text-2xl font-bold">{kpis.pedidos}</div></div>
                <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Itens vendidos</div><div className="text-2xl font-bold">{kpis.itensVendidos}</div></div>
                <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Ticket médio</div><div className="text-2xl font-bold">R$ {kpis.ticketMedio.toFixed(2)}</div></div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-2">Faturamento por dia</div>
                  <ChartContainer config={{ total: { label: "Total", color: "hsl(200, 90%, 50%)" } }} className="h-64">
                    <LineChart data={seriesDia}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Line dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={false} />
                      <ChartTooltip content={<ChartTooltipContent nameKey="total" />} />
                    </LineChart>
                  </ChartContainer>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-2">Receita por categoria (top 10)</div>
                  <ChartContainer config={{ total: { label: "Total", color: "hsl(20, 90%, 50%)" } }} className="h-64">
                    <BarChart data={barrasCategoria}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-25} height={60} textAnchor="end" />
                      <YAxis tickLine={false} axisLine={false} />
                      <Bar dataKey="total" fill="var(--color-total)" radius={[4,4,0,0]}>
                        {barrasCategoria.map((_, i) => (
                          <Cell key={`bar-${i}`} fill={barColors[i % barColors.length]} />
                        ))}
                      </Bar>
                      <ChartTooltip content={<ChartTooltipContent nameKey="total" />} />
                    </BarChart>
                  </ChartContainer>
                </div>

                <div className="rounded-lg border p-4 lg:col-span-2">
                  <div className="text-sm text-muted-foreground mb-2">Top produtos (receita)</div>
                  <ChartContainer config={{ value: { label: "Valor", color: "hsl(330, 80%, 50%)" } }} className="h-64">
                    <PieChart>
                      <Pie dataKey="value" data={pizzaProdutos} nameKey="name" innerRadius={40} outerRadius={90} strokeWidth={2}>
                        {pizzaProdutos.map((_, i) => (
                          <Cell key={`slice-${i}`} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                      <ChartLegend verticalAlign="bottom" align="center" />
                      <ChartTooltip content={<ChartTooltipContent nameKey="value" />} />
                    </PieChart>
                  </ChartContainer>
                </div>

                <div className="rounded-lg border p-4 lg:col-span-2">
                  <div className="text-sm text-muted-foreground mb-2">Totais por forma de pagamento</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {(["CASH","PIX","CARD","CREDIT","DEBIT"] as const).map((m) => (
                      <div key={m} className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">{m}</div>
                        <div className="text-lg font-semibold">R$ {Number(salesSummary?.byPayment?.[m]?.total || 0).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{salesSummary?.byPayment?.[m]?.count || 0} pedidos</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabela simples */}
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-2">Itens do período</div>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="p-2">Data</th>
                        <th className="p-2">Produto</th>
                        <th className="p-2">Categoria</th>
                        <th className="p-2">Qtd</th>
                        <th className="p-2">Preço</th>
                        <th className="p-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((it, i) => {
                        const prod = productById.get(it.productId);
                        const subtotal = (it.qty || 0) * (it.price || 0);
                        return (
                          <tr key={i} className="border-t">
                            <td className="p-2">{format(new Date(it.data_pedido || cSafeDate()), "dd/MM/yyyy HH:mm")}</td>
                            <td className="p-2">{prod?.name || it.productId}</td>
                            <td className="p-2">{categoryName(prod?.categoryId)}</td>
                            <td className="p-2">{it.qty}</td>
                            <td className="p-2">R$ {Number(it.price || 0).toFixed(2)}</td>
                            <td className="p-2">R$ {subtotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="movs" className="mt-4">
          {loading ? (
            <div className="rounded-lg border p-6">Carregando...</div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Entradas</div><div className="text-2xl font-bold">R$ {movResumo.totalIn.toFixed(2)}</div></div>
                <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Saídas</div><div className="text-2xl font-bold">R$ {movResumo.totalOut.toFixed(2)}</div></div>
                <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Saldo</div><div className="text-2xl font-bold">R$ {(movResumo.balance).toFixed(2)}</div></div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground mb-2">Movimentações do período</div>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="p-2">Data</th>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Valor</th>
                        <th className="p-2">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movResumo.items.map((m) => (
                        <tr key={m.id} className="border-t">
                          <td className="p-2">{format(new Date(m.createdAt), "dd/MM/yyyy HH:mm")}</td>
                          <td className="p-2">{m.type}</td>
                          <td className="p-2">R$ {Number(m.amount || 0).toFixed(2)}</td>
                          <td className="p-2">{m.description || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {cashMovs.length === 0 && (
                  <div className="text-sm text-muted-foreground mt-2">Sem caixa aberto ou sem movimentos para o período.</div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function cSafeDate() {
  return new Date().toISOString();
}

function enumerateDays(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    out.push(format(cur, "yyyy-MM-dd"));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function quickRanges(setter: (v: any) => void) {
  const to = new Date();
  const last7 = new Date();
  last7.setDate(to.getDate() - 6);
  const last30 = new Date();
  last30.setDate(to.getDate() - 29);
  // alterna entre 7 e 30 dias
  setter((s: any) => (s && s.from === last7.toISOString().slice(0, 10)
    ? { from: last30.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
    : { from: last7.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }));
}
