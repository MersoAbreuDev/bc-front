import React, { useEffect, useMemo, useState } from "react";
import BackButton from "@/components/common/BackButton";
import * as CaixaService from "@/services/caixa";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import CurrencyInput from "@/components/common/CurrencyInput";
import { Button } from "@/components/ui/button";
import { useAlert } from "@/components/common/ConfirmProvider";
import { format } from "date-fns";
import { getCurrentUser } from "@/services/auth/api";

export default function CaixaPage() {
  const [openBox, setOpenBox] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialCash, setInitialCash] = useState<number>(0);
  const [obs, setObs] = useState("");

  const [movType, setMovType] = useState<"entry" | "exit">("entry");
  const [movValue, setMovValue] = useState<number>(0);
  const [movForma, setMovForma] = useState<string>("dinheiro");
  const [movRef, setMovRef] = useState<string>("");
  const [movObs, setMovObs] = useState<string>("");

  const [movements, setMovements] = useState<Array<any>>([]);
  const [summary, setSummary] = useState<{ totalIn: number; totalOut: number; balance: number }>({ totalIn: 0, totalOut: 0, balance: 0 });
  const [totalsByMethod, setTotalsByMethod] = useState<{ pix: number; card: number; cash: number }>({ pix: 0, card: 0, cash: 0 });

  const [closingCash, setClosingCash] = useState<number>(0);

  const user = getCurrentUser();
  const showAlert = useAlert();

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const res = await CaixaService.getOpenCashRemote();
      if (!res.success) throw new Error(res.message || "Falha ao carregar caixa");
      const cash = res.data;
      if (!cash) {
        setOpenBox(null);
        setMovements([]);
        setSummary({ totalIn: 0, totalOut: 0, balance: 0 });
      } else {
        setOpenBox({
          caixa_id: cash.id,
          data_abertura: cash.createdAt,
          usuario_responsavel: cash.openedBy?.name || user?.name || "Operador",
          saldo_inicial_efetivo: Number(cash.openingAmount || 0),
          saldo_inicial_cartao: 0,
          status: cash.status === "OPEN" ? "open" : "closed",
        } as any);
        // Busca movimentos via API dedicada
        const list = await CaixaService.listMovementsRemote(cash.id);
        if (list.success) {
          const mapped = (list.data || []).map((m) => ({
            id: m.id,
            data_hora: m.createdAt,
            tipo: m.type === "entry" || m.type === "supply" ? "entrada" : "saida",
            valor: Number(m.amount),
            forma_pagamento: "dinheiro",
            documento_referencia: "",
            observacao: m.description || "",
            operador: user?.name || "Operador",
          }));
          setMovements(mapped);
        } else {
          setMovements([]);
        }
        // Busca resumo de vendas do caixa aberto (dashboard summary)
        try {
          const dash = await CaixaService.getCashSummaryRemote(cash.id);
          if (dash.success && dash.data) {
            setTotalsByMethod({
              pix: Number(dash.data.byPayment?.PIX || 0),
              card: Number(dash.data.byPayment?.CARD || 0),
              cash: Number(dash.data.byPayment?.CASH || 0),
            });
          } else {
            setTotalsByMethod({ pix: 0, card: 0, cash: 0 });
          }
        } catch {
          setTotalsByMethod({ pix: 0, card: 0, cash: 0 });
        }
        setSummary(computeSummary());
      }
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  const computeSummary = useMemo(() => {
    return () => {
      const totals = movements.reduce((acc: any, m: any) => {
        if (m.tipo === "entrada") {
          acc.totalIn += Number(m.valor || 0);
          if (m.forma_pagamento === "dinheiro") acc.dinheiroIn += Number(m.valor || 0);
          if (m.forma_pagamento === "cartao") acc.cartao += Number(m.valor || 0);
          if (m.forma_pagamento === "pix") acc.pix += Number(m.valor || 0);
        } else {
          acc.totalOut += Number(m.valor || 0);
          if (m.forma_pagamento === "dinheiro") acc.dinheiroOut += Number(m.valor || 0);
        }
        return acc;
      }, { totalIn: 0, totalOut: 0, dinheiroIn: 0, dinheiroOut: 0, cartao: 0, pix: 0 });
      const saldoInicial = openBox ? (openBox.saldo_inicial_efetivo || 0) : 0;
      const balance = saldoInicial + totals.dinheiroIn - totals.dinheiroOut;
      return { totalIn: totals.totalIn, totalOut: totals.totalOut, balance };
    };
  }, [movements, openBox]);

  async function handleOpen() {
    try {
      const openingAmount = Number(initialCash || 0) > 0 ? Number(initialCash || 0).toFixed(2) : undefined;
      const remote = await CaixaService.openCashRemote(openingAmount);
      if (!remote.success) {
        // Se o backend informar que já há caixa aberto, apenas sincroniza estado
        if (/já existe um caixa aberto/i.test(remote.message || "")) {
          await refresh();
          return;
        }
        throw new Error(remote.message || "Falha ao abrir caixa");
      }
      await refresh();
    } catch (e) { console.error(e); }
  }

  async function handleAddMovement() {
    if (!openBox) { await showAlert({ title: "Caixa fechado", description: "Abra o caixa antes de registrar movimentações.", okText: "Entendi" }); return; }
    if (!movValue || movValue <= 0) { await showAlert({ title: "Valor inválido", description: "Informe um valor maior que 0.", okText: "OK" }); return; }
    try {
      const amount = Number(movValue).toFixed(2);
      const res = await CaixaService.registerMovementRemote({ type: movType, amount, description: movObs || undefined });
      if (!res.success) throw new Error(res.message || "Falha ao registrar movimentação");
      await refresh();
      setMovValue(0);
      setMovRef("");
      setMovObs("");
    } catch (e) {
      console.error(e);
      await showAlert({ title: "Erro", description: "Falha ao registrar movimentação.", okText: "OK" });
    }
  }

  async function handleClose() {
    if (!openBox) return;
    try {
      const counted = Number(closingCash || 0).toFixed(2);
      const remote = await CaixaService.closeCashRemote(counted);
      if (!remote.success) throw new Error(remote.message || "Falha ao fechar caixa");
      // Recarrega imediatamente o resumo do dashboard e o estado do caixa
      await refresh();
    } catch (e) {
      console.warn("Erro ao fechar caixa remoto", e);
      await showAlert({ title: "Erro", description: "Falha ao fechar caixa remoto.", okText: "OK" });
    } finally {
      // Limpa valores do fechamento
      setClosingCash(0);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <BackButton to="/dashboard" />
        <h2 className="text-2xl font-bold">Caixa</h2>
        <div />
      </div>

      {loading ? (
        <div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="col-span-2 space-y-4">
              <div className="rounded-lg border p-4">
                <div className="h-6 bg-gray-200 animate-pulse rounded w-1/3 mb-2" />
                <div className="h-6 bg-gray-200 animate-pulse rounded w-full mb-2" />
              </div>
              <div className="rounded-lg border p-4">
                {[...Array(3)].map((_,i)=>(<div key={i} className="h-4 bg-gray-200 animate-pulse rounded w-full mb-2" />))}
              </div>
            </div>
            <div>
              <div className="rounded-lg border p-4">
                <div className="h-6 bg-gray-200 animate-pulse rounded w-1/2 mb-2" />
                <div className="h-6 bg-gray-200 animate-pulse rounded w-full" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="col-span-2 space-y-4">
            {/* Open box or details */}
            {!openBox ? (
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Abertura de Caixa</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>Saldo inicial - Dinheiro (troco)</Label>
                    <CurrencyInput value={initialCash} onChange={(n) => setInitialCash(n)} />
                  </div>
                </div>
                <div className="mt-3">
                  <Label>Observações</Label>
                  <Input value={obs} onChange={(e) => setObs(e.target.value)} />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleOpen}>Abrir Caixa</Button>
                  <Button variant="ghost" onClick={() => { setInitialCash(0); setObs(""); }}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Aberto em</div>
                    <div className="font-medium">{format(new Date(openBox.data_abertura), "dd/MM/yyyy HH:mm")}</div>
                    <div className="text-sm text-muted-foreground">Operador: {openBox.usuario_responsavel}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="font-medium text-green-600">Aberto</div>
                  </div>
                </div>
              </div>
            )}

            {/* Movements */}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Registrar Movimentação</h3>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setMovType("entry")} className={`px-3 py-1 rounded ${movType === "entry" ? "bg-[#ffecd6]" : "border"}`}>Entrada</button>
                <button onClick={() => setMovType("exit")} className={`px-3 py-1 rounded ${movType === "exit" ? "bg-[#ffecd6]" : "border"}`}>Saída</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <Label>Valor (BRL)</Label>
                  <CurrencyInput value={movValue} onChange={(n) => setMovValue(n)} />
                </div>

                <div className="flex flex-col">
                  <Label>Forma de pagamento</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    value={"dinheiro"}
                    disabled
                  >
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <Label>Documento / Referência</Label>
                  <Input value={movRef} onChange={(e) => setMovRef(e.target.value)} />
                </div>

                <div className="flex flex-col">
                  <Label>Observação</Label>
                  <Input value={movObs} onChange={(e) => setMovObs(e.target.value)} />
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button onClick={handleAddMovement}>Registrar</Button>
                <Button variant="outline" onClick={() => { setMovValue(0); setMovRef(""); setMovObs(""); }}>Cancelar</Button>
              </div>
            </div>

            {/* Movements list */}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Movimentações recentes</h3>
              {movements.filter(m => m.forma_pagamento === 'dinheiro').length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma movimentação em dinheiro registrada.</div>
              ) : (
                <div className="space-y-2">
                  {movements.filter(m => m.forma_pagamento === 'dinheiro').map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{m.tipo === "entrada" ? "Entrada" : "Saída"} — {m.forma_pagamento}</div>
                        <div className="text-sm text-muted-foreground">{m.documento_referencia || "-"} • {format(new Date(m.data_hora), "dd/MM HH:mm")}</div>
                      </div>
                      <div className={`font-semibold ${m.tipo === "entrada" ? "text-green-600" : "text-red-600"}`}>R$ {Number(m.valor).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: summary and close */}
          <div>
            <div className="rounded-lg border p-4 mb-4">
              <h4 className="text-sm text-muted-foreground">Resumo do Caixa</h4>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between"><div>Saldo inicial (dinheiro)</div><div>R$ {openBox ? (openBox.saldo_inicial_efetivo||0).toFixed(2) : '0.00'}</div></div>
                <div className="flex justify-between"><div>Entradas - PIX</div><div className="text-green-600">R$ {Number(totalsByMethod.pix||0).toFixed(2)}</div></div>
                <div className="flex justify-between"><div>Entradas - Cartão</div><div className="text-green-600">R$ {Number(totalsByMethod.card||0).toFixed(2)}</div></div>
                <div className="flex justify-between"><div>Entradas - Dinheiro</div><div className="text-green-600">R$ {Number(totalsByMethod.cash||0).toFixed(2)}</div></div>
                <div className="flex justify-between"><div>Saídas - Dinheiro</div><div className="text-red-600">R$ {(movements.filter(m => m.tipo === 'saida' && m.forma_pagamento === 'dinheiro').reduce((s,m)=>s+Number(m.valor||0),0)).toFixed(2)}</div></div>
                <div className="flex justify-between font-bold"><div>Saldo esperado (dinheiro)</div><div>R$ {( (openBox? (openBox.saldo_inicial_efetivo||0):0) + Number(totalsByMethod.cash||0) - movements.filter(m=>m.tipo==='saida' && m.forma_pagamento==='dinheiro').reduce((s,m)=>s+Number(m.valor||0),0) ).toFixed(2)}</div></div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">Fechamento do Caixa</h4>
              <div>
                <Label>Valor contado - Dinheiro</Label>
                <CurrencyInput value={closingCash} onChange={(n) => setClosingCash(n)} />
              </div>
              <div className="mt-3">
                <div className="flex justify-between"><div>Saldo teórico (dinheiro)</div><div>R$ {((openBox? (openBox.saldo_inicial_efetivo||0):0) + movements.filter(m=>m.tipo==='entrada' && m.forma_pagamento==='dinheiro').reduce((s,m)=>s+Number(m.valor||0),0) - movements.filter(m=>m.tipo==='saida' && m.forma_pagamento==='dinheiro').reduce((s,m)=>s+Number(m.valor||0),0)).toFixed(2)}</div></div>
                <div className="flex justify-between"><div>Saldo contado (dinheiro)</div><div>R$ {Number(closingCash||0).toFixed(2)}</div></div>
                <div className="flex justify-between"><div>Diferença</div><div className={`${(Number(closingCash||0) - ((openBox? (openBox.saldo_inicial_efetivo||0):0) + movements.filter(m=>m.tipo==='entrada' && m.forma_pagamento==='dinheiro').reduce((s,m)=>s+Number(m.valor||0),0) - movements.filter(m=>m.tipo==='saida' && m.forma_pagamento==='dinheiro').reduce((s,m)=>s+Number(m.valor||0),0))) >=0 ? 'text-green-600' : 'text-red-600'}`}>R$ {(Number(closingCash||0) - ((openBox? (openBox.saldo_inicial_efetivo||0):0) + movements.filter(m=>m.tipo==='entrada' && m.forma_pagamento==='dinheiro').reduce((s,m)=>s+Number(m.valor||0),0) - movements.filter(m=>m.tipo==='saida' && m.forma_pagamento==='dinheiro').reduce((s,m)=>s+Number(m.valor||0),0))).toFixed(2)}</div></div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={handleClose} disabled={!openBox}>Fechar Caixa</Button>
                <Button variant="outline" onClick={() => { setClosingCash(0); }}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
