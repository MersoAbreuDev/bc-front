export interface ComandaItem {
  id: string;
  productId: string;
  name: string;
  qty: number;
  price: number;
  entregue?: boolean;
  data_pedido: string;
  data_entrega?: string | null;
  garcom_id?: string;
}

export interface Comanda {
  id: string;
  table?: string;
  items: ComandaItem[];
  openAt: string;
  closedAt?: string | null;
  status?: "ABERTA" | "FECHADA";
  total?: number;
  responsibleName?: string;
}
import { getCurrentUser } from "@/services/auth/api";

function getApiBase(): string {
  const base = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:5337";
  return String(base || "http://localhost:5337").replace(/\/$/, "");
}

function getTenantId(): string | undefined {
  const user = getCurrentUser() as any;
  const fromUser = user?.tenantId || user?.tenant?.id;
  const fromEnv = (import.meta as any)?.env?.VITE_TENANT_ID as string | undefined;
  const fromStorage = (typeof localStorage !== "undefined" ? localStorage.getItem("bcomandas:tenantId") || localStorage.getItem("tenantId") : null) || undefined;
  return fromUser || fromStorage || fromEnv;
}

async function apiGet<T = any>(path: string): Promise<{ ok: boolean; status: number; data?: T; message?: string }>{
  const user = getCurrentUser();
  const token = user?.token;
  const base = getApiBase();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(getTenantId() ? { "x-tenantid": String(getTenantId()) } : {}),
    },
  });
  let data: any = undefined;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    let message: string | undefined;
    if (data) {
      const raw = data.message || data.error;
      if (Array.isArray(raw)) message = raw.join("; ");
      else if (typeof raw === "string") message = raw;
    }
    return { ok: false, status: res.status, data, message: message || `Erro ${res.status}` };
  }
  return { ok: true, status: res.status, data };
}

async function apiSend<T = any>(path: string, method: "POST" | "PATCH" | "DELETE", body?: any): Promise<{ ok: boolean; status: number; data?: T; message?: string }>{
  const user = getCurrentUser();
  const token = user?.token;
  const base = getApiBase();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(getTenantId() ? { "x-tenantid": String(getTenantId()) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = undefined;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    let message: string | undefined;
    if (data) {
      const raw = data.message || data.error;
      if (Array.isArray(raw)) message = raw.join("; ");
      else if (typeof raw === "string") message = raw;
    }
    return { ok: false, status: res.status, data, message: message || `Erro ${res.status}` };
  }
  return { ok: true, status: res.status, data };
}

function mapBackendItem(it: any): ComandaItem {
  return {
    id: it?.id,
    productId: it?.product?.id,
    name: it?.product?.name,
    qty: Number(it?.quantity || 0),
    price: Number(it?.unitPrice || 0),
    entregue: it?.status === "DELIVERED",
    data_pedido: it?.createdAt || new Date().toISOString(),
    data_entrega: it?.deliveredAt || null,
  };
}

function mapBackendTab(tab: any): Comanda {
  const items = Array.isArray(tab?.items) ? tab.items.map(mapBackendItem) : [];
  return {
    id: tab?.id,
    table: tab?.buyerName,
    items,
    openAt: tab?.createdAt || new Date().toISOString(),
    closedAt: tab?.closedAt || null,
    status: tab?.status === "OPEN" ? "ABERTA" : (tab?.status === "CLOSED" ? "FECHADA" : undefined),
    total: Number(tab?.total || 0),
    responsibleName: tab?.responsibleName || tab?.openedBy?.name || tab?.waiter?.name || tab?.waiterName || undefined,
  };
}

export async function openTab(payload: { buyerName: string; items: Array<{ productId: string; quantity: number }>; paymentMethod?: "CASH" | "PIX" | "CREDIT" | "DEBIT"; clientId?: string; responsibleName?: string }): Promise<Comanda> {
  const body: any = {
    buyerName: payload.buyerName,
    items: (payload.items || []).map((it) => ({ productId: it.productId, quantity: it.quantity })),
  };
  if (payload.responsibleName) body.responsibleName = payload.responsibleName;
  if (payload.paymentMethod) body.paymentMethod = payload.paymentMethod;
  if (payload.clientId) body.clientId = payload.clientId;
  const res = await apiSend<any>(`/tabs/open`, "POST", body);
  if (!res.ok) throw new Error(res.message || "Falha ao abrir comanda");
  return mapBackendTab(res.data);
}

export async function createComanda(payload: Partial<Comanda> & { paymentMethod?: string; clientId?: string; responsibleName?: string }): Promise<Comanda> {
  const items = (payload.items || []).map((i) => ({ productId: i.productId, quantity: i.qty }));
  const pm = (payload.paymentMethod || "CASH").toUpperCase() as any;
  return openTab({ buyerName: payload.table || "Mesa", items, paymentMethod: pm, clientId: payload.clientId, responsibleName: payload.responsibleName });
}

export async function getActiveComandas(): Promise<Comanda[]> {
  const all = await listComandas();
  return all.filter((c) => c.status === "ABERTA");
}

export async function listComandas(): Promise<Comanda[]> {
  const res = await apiGet<any[]>(`/tabs`);
  if (!res.ok) throw new Error(res.message || "Falha ao listar comandas");
  const list = Array.isArray(res.data) ? res.data : [];
  return list.map(mapBackendTab);
}

export async function getComanda(id: string): Promise<Comanda | null> {
  const res = await apiGet<any>(`/tabs/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(res.message || "Falha ao obter comanda");
  return mapBackendTab(res.data);
}

export async function addItem(comandaId: string, item: { productId: string; qty: number }): Promise<Comanda> {
  const body = { tabId: comandaId, productId: item.productId, quantity: item.qty };
  // Endpoint principal: body com tabId
  let res = await apiSend<any>(`/tabs/items`, "POST", body);
  // Fallback: alguns ambientes aceitam rota com :id; tenta a rota alternativa
  if (!res.ok && (res.status === 404 || res.status === 405)) {
    res = await apiSend<any>(`/tabs/${encodeURIComponent(comandaId)}/items`, "POST", body);
  }
  if (!res.ok) throw new Error(res.message || "Falha ao adicionar item");
  return mapBackendTab(res.data);
}

export async function markItemDelivered(comandaId: string, itemId: string): Promise<Comanda> {
  const res = await apiSend<any>(`/tabs/${encodeURIComponent(comandaId)}/items/${encodeURIComponent(itemId)}/deliver`, "PATCH");
  if (!res.ok) throw new Error(res.message || "Falha ao entregar item");
  return mapBackendTab(res.data);
}

export async function closeComanda(comandaId: string, payload: { forma_pagamento?: string }): Promise<Comanda> {
  const pm = (payload.forma_pagamento || "CASH").toUpperCase();
  const res = await apiSend<any>(`/tabs/${encodeURIComponent(comandaId)}/close`, "PATCH", { paymentMethod: pm });
  if (!res.ok) throw new Error(res.message || "Falha ao fechar comanda");
  return mapBackendTab(res.data);
}

export async function updateItemQuantity(comandaId: string, itemId: string, quantity: number): Promise<Comanda> {
  const res = await apiSend<any>(`/tabs/${encodeURIComponent(comandaId)}/items/${encodeURIComponent(itemId)}`, "PATCH", { quantity });
  if (!res.ok) throw new Error(res.message || "Falha ao atualizar item");
  return mapBackendTab(res.data);
}

export async function deleteItem(comandaId: string, itemId: string): Promise<Comanda> {
  const res = await apiSend<any>(`/tabs/${encodeURIComponent(comandaId)}/items/${encodeURIComponent(itemId)}`, "DELETE");
  if (!res.ok) throw new Error(res.message || "Falha ao remover item");
  return mapBackendTab(res.data);
}
