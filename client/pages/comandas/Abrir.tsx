import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/services/auth/api";
import * as ComandaService from "@/services/comanda";
import * as ProdutosService from "@/services/produtos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CurrencyInput from "@/components/common/CurrencyInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AbrirComanda() {
  const [comandas, setComandas] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const user = getCurrentUser();

  // products
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [note, setNote] = useState("");

  // filter & pagination
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  // status filter: 'open' | 'closed' | 'all'
  const [statusFilter, setStatusFilter] = useState<'open'|'closed'|'all'>('open');

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [draftTabId, setDraftTabId] = useState<string | null>(null);
  const [createResponsible, setCreateResponsible] = useState<string>(user?.name || "");
  const [createItems, setCreateItems] = useState<any[]>([]);
  const [tempProductId, setTempProductId] = useState("");
  const [tempQty, setTempQty] = useState<number>(1);
  const [tempProductInput, setTempProductInput] = useState<string>("");
  const [tempPrice, setTempPrice] = useState<number>(0);

  // view modal
  const [viewOpen, setViewOpen] = useState(false);
  const [productInput, setProductInput] = useState<string>("");

  // close modal values
  const [closeOpen, setCloseOpen] = useState(false);
  const [acrescimo, setAcrescimo] = useState<number>(0);
  const [desconto, setDesconto] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState<string>("CASH");
  const [observacao, setObservacao] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // load products once
    (async () => {
      try {
        setProductsLoading(true);
        const prods = await ProdutosService.listProducts();
        setProducts(prods || []);
        if (prods && prods.length > 0) {
          setTempProductId(prods[0].id);
          setTempPrice(Number(prods[0].price || 0));
          if (!productId) {
            setProductId(prods[0].id);
            setPrice(Number(prods[0].price || 0));
          }
        } else {
          toast.info("Nenhum produto encontrado neste tenant.");
        }
      } catch (e: any) {
        toast.error(e?.message || "Falha ao carregar produtos");
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // load comandas whenever statusFilter changes
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Garantir seleção e preço válidos quando os produtos carregarem/trocarem
  useEffect(() => {
    if ((products || []).length > 0) {
      if (!tempProductId || !products.find((p) => p.id === tempProductId)) {
        setTempProductId(products[0].id);
        setTempPrice(Number(products[0].price || 0));
      }
      if (!productId || !products.find((p) => p.id === productId)) {
        setProductId(products[0].id);
        setPrice(Number(products[0].price || 0));
      }
    }
  }, [products]);

  // Atualiza preço ao trocar productId
  useEffect(() => {
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    if (prod) setPrice(Number(prod.price || 0));
  }, [productId, products]);

  useEffect(() => {
    // gera um id lógico para a comanda em edição (antes de salvar)
    if (createOpen && !draftTabId) {
      try {
        // @ts-ignore
        const uuid = (crypto && (crypto.randomUUID?.() || null)) as string | null;
        setDraftTabId(uuid || `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`);
      } catch {
        setDraftTabId(`draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`);
      }
    }
    // ao fechar o modal, limpa rascunho e itens temporários
    if (!createOpen) {
      setDraftTabId(null);
      setCreateItems([]);
    }
  }, [createOpen]);

  const load = async () => {
    setLoading(true);
    try {
      let list: any[] = [];
      if (statusFilter === 'open') {
        list = await ComandaService.getActiveComandas();
      } else {
        // fetch all and filter client-side
        const all = await ComandaService.listComandas();
        if (statusFilter === 'closed') list = all.filter((c: any) => c.closedAt || c.status === 'FECHADA');
        else list = all;
      }
      setComandas(list);
      if (list.length > 0 && !selected) setSelected(list[0]);
    } catch (e) {
      setComandas([]);
      setSelected(null);
      const msg = (e as any)?.message || 'Falha ao carregar comandas';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredComandas = comandas
    .filter((c) => !filter || (String(c.responsibleName || "").toLowerCase().includes(filter.toLowerCase())))
    .filter((c) => {
      if (statusFilter === 'open') return !c.closedAt && c.status !== 'FECHADA';
      if (statusFilter === 'closed') return c.closedAt || c.status === 'FECHADA';
      return true;
    });

  // create modal helpers
  const addTempItem = () => {
    const prod = products.find((p) => p.id === tempProductId);
    if (!prod) return;
    const it = { id: `temp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`, tabId: draftTabId, productId: tempProductId, name: prod.name, qty: tempQty || 1, price: tempPrice || prod.price || 0 };
    setCreateItems((s) => [...s, it]);
    setTempQty(1);
    setTempPrice(prod.price || 0);
  };
  const removeTempItem = (id: string) => setCreateItems((s) => s.filter((it) => it.id !== id));

  const createComandaFromModal = async () => {
    try {
      const payload: any = {
        responsibleName: createResponsible || user?.name,
        clientId: draftTabId || undefined,
        items: createItems.map((it) => ({ productId: it.productId, qty: it.qty, name: it.name, price: it.price })),
      };
      const c = await ComandaService.createComanda(payload);
      setCreateOpen(false);
      setCreateItems([]);
      setCreateResponsible(user?.name || "");
      await load();
      setSelected(c);
      setViewOpen(true);
      toast.success('Comanda aberta com sucesso');
    } catch (e) {
      const msg = (e as any)?.message || 'Falha ao abrir comanda';
      toast.error(msg);
    }
  };

  const openView = (c: any) => {
    setSelected(c);
    if (!productId && products[0]) {
      setProductId(products[0].id);
      setPrice(products[0].price || 0);
    }
    setViewOpen(true);
  };

  const addItem = async () => {
    if (!selected) return;
    try {
      const prod = products.find((p) => p.id === productId);
      await ComandaService.addItem(selected.id, { productId, qty });
      const refreshed = await ComandaService.getComanda(selected.id);
      setSelected(refreshed);
      setQty(1);
      setPrice(prod?.price || 0);
      setNote("");
      await load();
      toast.success('Item adicionado');
    } catch (e) {
      const msg = (e as any)?.message || 'Falha ao adicionar item';
      toast.error(msg);
    }
  };

  const markDelivered = async (itemId: string) => {
    if (!selected) return;
    try {
      await ComandaService.markItemDelivered(selected.id, itemId);
      const refreshed = await ComandaService.getComanda(selected.id);
      setSelected(refreshed);
      await load();
      toast.success('Item marcado como entregue');
    } catch (e) {
      const msg = (e as any)?.message || 'Falha ao marcar item entregue';
      toast.error(msg);
    }
  };

  const openCloseModal = () => {
    if (!selected) return;
    setAcrescimo(0);
    setDesconto(0);
    setFormaPagamento("CASH");
    setObservacao("");
    setCloseOpen(true);
  };

  const doClose = async () => {
    if (!selected) return;
    const deliveredCount = (selected.items || []).filter((it: any) => it.entregue).length;
    if (deliveredCount === 0) {
      toast.error("Não é possível fechar comanda sem itens entregues.");
      return;
    }
    setSaving(true);
    try {
      await ComandaService.closeComanda(selected.id, { forma_pagamento: formaPagamento });
      setCloseOpen(false);
      setViewOpen(false);
      await load();
      setSelected(null);
      toast.success('Comanda fechada');
    } catch (e) {
      const msg = (e as any)?.message || 'Falha ao fechar comanda';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const subtotalDelivered = selected ? (selected.items || []).filter((it: any) => it.entregue).reduce((s: number, it: any) => s + (it.qty * (it.price || 0)), 0) : 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Atendimentos</h2>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => { setStatusFilter('open'); setPage(1); }} className={`px-3 py-1 rounded ${statusFilter === 'open' ? 'bg-gray-200' : 'border'}`}>Abertas</button>
            <button onClick={() => { setStatusFilter('closed'); setPage(1); }} className={`px-3 py-1 rounded ${statusFilter === 'closed' ? 'bg-gray-200' : 'border'}`}>Fechadas</button>
            <button onClick={() => { setStatusFilter('all'); setPage(1); }} className={`px-3 py-1 rounded ${statusFilter === 'all' ? 'bg-gray-200' : 'border'}`}>Todas</button>
          </div>
          <Input placeholder="Buscar por responsável" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="w-full md:w-64 h-10 mb-0" />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">Novo Atendimento</Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-auto sm:max-w-[700px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Novo Atendimento</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Responsável</Label>
                  <Input value={createResponsible} onChange={(e) => setCreateResponsible(e.target.value)} placeholder={user?.name || ''} className="h-10 mb-0" />
                </div>

                <div>
                  <h4 className="font-medium">Itens (opcional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 items-end">
                    <div>
                      <Label>Produto</Label>
                      <select
                        value={tempProductId && products.find(p=>p.id===tempProductId) ? tempProductId : (products[0]?.id || "")}
                        onChange={(e) => { setTempProductId(e.target.value); const prod = products.find((p)=>p.id===e.target.value); setTempPrice(Number(prod?.price||0)); }}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                        disabled={productsLoading || products.length === 0}
                      >
                        {products.length === 0 ? (
                          <option value="" disabled>Nenhum produto</option>
                        ) : (
                          products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))
                        )}
                      </select>
                    </div>
                    <div>
                      <Label>Quantidade</Label>
                      <Input type="number" inputMode="numeric" value={tempQty} onChange={(e) => setTempQty(parseInt(e.target.value || '1'))} className="h-10 mb-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div>
                      <Label>Preço unit.</Label>
                      <CurrencyInput value={tempPrice} onChange={(n) => setTempPrice(n)} className="h-10 mb-0" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <Button variant="outline" onClick={addTempItem}>Adicionar item</Button>
                  </div>

                  <div className="mt-2 space-y-2">
                    {createItems.map((it) => (
                      <div key={it.id} className="flex items-center justify-between border p-3 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{it.name}</div>
                          <div className="text-sm text-muted-foreground">Qtd: {it.qty}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div>R$ {Number(it.price * it.qty).toFixed(2)}</div>
                          <button className="text-sm text-red-600" onClick={() => removeTempItem(it.id)}>Remover</button>
                        </div>
                      </div>
                    ))}
                    {createItems.length === 0 && <div className="text-sm text-muted-foreground">Nenhum item adicionado</div>}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={createComandaFromModal}>Abrir Atendimento</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(8)].map((_, i) => (<div key={i} className="h-32 bg-gray-100 animate-pulse rounded" />))
        ) : (
          filteredComandas.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma comanda</div> : (
            filteredComandas.slice((page - 1) * pageSize, page * pageSize).map((c) => (
              <div key={c.id} className={`p-3 rounded border cursor-pointer ${selected?.id === c.id ? 'bg-gray-100' : 'hover:bg-gray-50' } flex flex-col justify-between h-full break-words`} onClick={() => openView(c)}>
                <div>
                  <div className="font-medium">{c.responsibleName || 'Atendimento'}</div>
                  <div className="text-sm text-muted-foreground">Responsável: {c.responsibleName || '-'}</div>
                  <div className="text-sm text-muted-foreground">Abertura: {new Date(c.openAt).toLocaleString()}</div>
                </div>
                <div className="text-right mt-3">
                  <div className="text-sm">Itens: {(c.items || []).length}</div>
                  <div className="text-lg font-bold">R$ {Number(c.total || 0).toFixed(2)}</div>
                </div>
              </div>
            ))
          )
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded">Anterior</button>
        {Array.from({ length: Math.max(1, Math.ceil(filteredComandas.length / pageSize)) }).map((_, i) => (
          <button key={i} onClick={() => setPage(i + 1)} className={`px-2 py-1 rounded ${page === i + 1 ? 'bg-gray-200' : 'border'}`}>{i + 1}</button>
        ))}
        <button onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(filteredComandas.length / pageSize)), p + 1))} className="px-3 py-1 border rounded">Próxima</button>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="w-[95vw] sm:w-auto sm:max-w-[900px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Atendimento</DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Responsável</div>
                <div className="font-medium">{selected.responsibleName || selected.id}</div>
                <div className="text-sm text-muted-foreground">Abertura: {new Date(selected.openAt).toLocaleString()}</div>
              </div>

              <div>
                <h4 className="font-medium">Adicionar Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 items-end">
                  <div>
                    <Label>Produto</Label>
                    <select
                      value={productId && products.find(p=>p.id===productId) ? productId : (products[0]?.id || "")}
                      onChange={(e) => { setProductId(e.target.value); const prod = products.find((p) => p.id === e.target.value); setPrice(Number(prod?.price || 0)); }}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                      disabled={productsLoading || products.length === 0}
                    >
                      {products.length === 0 ? (
                        <option value="" disabled>Nenhum produto</option>
                      ) : (
                        products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))
                      )}
                    </select>
                  </div>
                  <div>
                    <Label>Quantidade</Label>
                    <Input type="number" value={qty} onChange={(e) => setQty(parseInt(e.target.value || '1'))} className="h-10 mb-0" />
                  </div>
                  <div>
                    <Label>Preço unit.</Label>
                    <CurrencyInput value={price} onChange={(n) => setPrice(n)} className="h-10 mb-0" />
                  </div>
                </div>
                  <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 mt-3">
                  <div className="text-sm text-muted-foreground">Observação (opcional)</div>
                  <div className="flex items-center gap-2">
                      <Input value={note} onChange={(e) => setNote(e.target.value)} className="w-full md:w-64 h-10 mb-0" />
                    <Button onClick={addItem}>Adicionar</Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Itens Pendentes</h4>
                  <div className="space-y-2 mt-2">
                    {(selected.items || []).filter((it: any) => !it.entregue).map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between border p-3 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{it.name}</div>
                          <div className="text-sm text-muted-foreground">Qtd: {it.qty} • Adicionado: {new Date(it.data_pedido).toLocaleString()}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div>R$ {Number(it.price * it.qty).toFixed(2)}</div>
                          <Button onClick={() => markDelivered(it.id)} variant="ghost" size="sm" className="h-8 px-2 whitespace-nowrap">Marcar Entregue</Button>
                        </div>
                      </div>
                    ))}
                    {(selected.items || []).filter((it: any) => !it.entregue).length === 0 && <div className="text-sm text-muted-foreground">Nenhum item pendente</div>}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium">Itens Entregues</h4>
                  <div className="space-y-2 mt-2">
                    {(selected.items || []).filter((it: any) => it.entregue).map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between border p-3 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{it.name}</div>
                          <div className="text-sm text-muted-foreground">Entregue em: {it.data_entrega ? new Date(it.data_entrega).toLocaleString() : '-'}</div>
                        </div>
                        <div className="text-right">R$ {Number(it.price * it.qty).toFixed(2)}</div>
                      </div>
                    ))}
                    {(selected.items || []).filter((it: any) => it.entregue).length === 0 && <div className="text-sm text-muted-foreground">Nenhum item entregue</div>}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">Subtotal: R$ {Number(subtotalDelivered).toFixed(2)}</div>
                <div className="flex gap-2">
                  <Button onClick={() => { if (selected) printComanda(selected); }} variant="outline">Imprimir</Button>
                  <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={openCloseModal} variant="ghost">Fechar Comanda</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Fechar Comanda</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-muted-foreground">Itens entregues</div>
                          <div className="space-y-2">
                            {(selected.items || []).filter((it: any) => it.entregue).map((it: any) => (
                              <div key={it.id} className="flex justify-between">
                                <div>{it.name} x{it.qty}</div>
                                <div>R$ {Number(it.price * it.qty).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between">
                            <div className="text-sm text-muted-foreground">Subtotal</div>
                            <div>R$ {Number(subtotalDelivered).toFixed(2)}</div>
                          </div>
                        </div>

                        <div>
                          <Label>Acréscimo</Label>
                          <CurrencyInput value={acrescimo} onChange={(n) => setAcrescimo(n)} />
                        </div>

                        <div>
                          <Label>Desconto</Label>
                          <CurrencyInput value={desconto} onChange={(n) => setDesconto(n)} />
                        </div>

                        <div>
                          <Label>Forma de pagamento</Label>
                          <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base">
                            <option value="CASH">Dinheiro</option>
                            <option value="CREDIT">Cartão crédito</option>
                            <option value="DEBIT">Cartão débito</option>
                            <option value="PIX">PIX</option>
                          </select>
                        </div>

                        <div>
                          <Label>Observação</Label>
                          <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} className="w-full rounded-md border p-2" />
                        </div>

                        <div className="flex justify-end">
                          <Button onClick={doClose} disabled={saving}>{saving ? 'Fechando...' : 'Fechar Comanda'}</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function printComanda(comanda: any) {
  try {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    const itemsHtml = (comanda.items || []).map((it: any) => `<tr><td style=\"padding:4px\">${it.name} x${it.qty}</td><td style=\"padding:4px;text-align:right\">R$ ${Number(it.price * it.qty).toFixed(2)}</td></tr>`).join("");
    const subtotal = (comanda.items || []).filter((it: any) => it.entregue).reduce((s: number, it: any) => s + (it.qty * (it.price || 0)), 0);
    const total = comanda.total || subtotal;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Atendimento</title><style>body{font-family:monospace;font-size:12px}table{width:100%;border-collapse:collapse}td{padding:4px}</style></head><body><h3>Atendimento</h3><div>Responsável: ${comanda.responsibleName || '-'}</div><div>Abertura: ${new Date(comanda.openAt).toLocaleString()}</div><table>${itemsHtml}</table><hr/><div>Subtotal: R$ ${Number(subtotal).toFixed(2)}</div><div>Total: R$ ${Number(total).toFixed(2)}</div></body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  } catch (e) { console.error(e); }
}
