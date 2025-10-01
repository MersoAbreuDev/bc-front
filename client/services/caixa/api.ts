export interface CaixaSummary {
  totalIn: number;
  totalOut: number;
  balance: number;
}

import * as ComandaService from "@/services/comanda";
import { getCurrentUser } from "@/services/auth/api";

// Local storage box management
export type FormaPagamento = "dinheiro" | "cartao" | "pix" | "cheque" | "outro";

export type MovimentoTipo = "entrada" | "saida";

export interface Movimento {
  id: string;
  tipo: MovimentoTipo;
  valor: number;
  forma_pagamento: FormaPagamento;
  data_hora: string;
  documento_referencia?: string;
  observacao?: string;
  operador?: string;
}

export interface Caixa {
  caixa_id: string;
  data_abertura: string; // ISO
  usuario_responsavel: string;
  saldo_inicial_efetivo: number;
  saldo_inicial_cartao: number;
  observacoes?: string;
  status: "open" | "closed";
  movements: Movimento[];
  data_fechamento?: string;
  usuario_responsavel_fechamento?: string;
  saldo_final_efetivo?: number;
  saldo_final_cartao?: number;
  diferenca?: number;
}

const KEY = "bcomandas:caixa";

function read(): Caixa[] {
  // Persistência local desativada
  return [];
}
function write(items: Caixa[]) {
  // Persistência local desativada
}

function nowISO() { return new Date().toISOString(); }

function getApiBase(): string {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5337"
  return base.replace(/\/$/, "")
  return String(base || "http://localhost:5337").replace(/\/$/, "");
}

function getTenantId(): string | undefined {
  const user = getCurrentUser() as any;
  const fromUser = user?.tenantId || user?.tenant?.id;
  const fromEnv = (import.meta as any)?.env?.VITE_TENANT_ID as string | undefined;
  const fromStorage = (typeof localStorage !== "undefined" ? localStorage.getItem("bcomandas:tenantId") || localStorage.getItem("tenantId") : null) || undefined;
  return fromUser || fromStorage || fromEnv;
}

async function apiPost<T = any>(path: string, body?: any): Promise<{ ok: boolean; status: number; data?: T; message?: string }>{
  const user = getCurrentUser();
  const token = user?.token;
  const base = getApiBase();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: "POST",
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
    if (res.status === 404) {
      return { ok: true, status: res.status, data: undefined };
    }
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

export async function openCashRemote(openingAmount?: string): Promise<{ success: boolean; data?: any; message?: string }>{
  const user = getCurrentUser();
  if (!user?.token) return { success: false, message: "Usuário não autenticado" };
  const body = openingAmount ? { openingAmount } : undefined;
  const res = await apiPost<any>("/cash/open", body);
  if (!res.ok) return { success: false, message: res.message };
  return { success: true, data: res.data };
}

export async function closeCashRemote(closingAmount?: string): Promise<{ success: boolean; data?: any; message?: string }>{
  const user = getCurrentUser();
  if (!user?.token) return { success: false, message: "Usuário não autenticado" };
  const res = await apiPost<any>("/cash/close", { closingAmount });
  if (!res.ok) return { success: false, message: res.message };
  return { success: true, data: res.data };
}

export type BackendCashMovementType = "supply" | "entry" | "exit" | "cashout";

export interface BackendCashMovement {
  id: string;
  type: BackendCashMovementType;
  amount: string; // decimal string
  description?: string | null;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
}

export interface BackendCash {
  id: string;
  status: "OPEN" | "CLOSED";
  totalMovements: string;
  openingAmount?: string;
  openedBy?: { id?: string; name?: string; email?: string };
  createdAt: string;
  updatedAt: string;
  movements?: BackendCashMovement[];
}

export interface BackendPaymentTotals {
  pix?: string; // decimal string
  credit?: string; // decimal string
  debit?: string; // decimal string
}

export async function getOpenCashRemote(): Promise<{ success: boolean; data?: BackendCash | null; message?: string }>{
  const user = getCurrentUser();
  if (!user?.token) return { success: false, message: "Usuário não autenticado" };
  // Pressupomos GET /cash/open retorna o caixa aberto com movimentos
  const res = await apiGet<BackendCash | null>("/cash/open");
  if (!res.ok) return { success: false, message: res.message };
  return { success: true, data: (res.data as any) ?? null };
}

export async function registerMovementRemote(params: { type: BackendCashMovementType; amount: string; description?: string }): Promise<{ success: boolean; data?: BackendCashMovement; message?: string }>{
  const user = getCurrentUser();
  if (!user?.token) return { success: false, message: "Usuário não autenticado" };
  const body = {
    type: params.type,
    amount: params.amount,
    ...(params.description ? { description: params.description } : {}),
  };
  const res = await apiPost<BackendCashMovement>("/cash/movement", body);
  if (!res.ok) return { success: false, message: res.message };
  return { success: true, data: res.data };
}

export async function listMovementsRemote(cashId: string): Promise<{ success: boolean; data?: BackendCashMovement[]; message?: string }>{
  const user = getCurrentUser();
  if (!user?.token) return { success: false, message: "Usuário não autenticado" };
  const res = await apiGet<BackendCashMovement[]>(`/cash/${cashId.replace(/:/g, "")}/movements`);
  if (!res.ok) return { success: false, message: res.message };
  return { success: true, data: (res.data as any) ?? [] };
}

export async function getSalesTotalsRemote(cashId: string): Promise<{ success: boolean; data?: BackendPaymentTotals; message?: string }>{
  const user = getCurrentUser();
  if (!user?.token) return { success: false, message: "Usuário não autenticado" };
  const res = await apiGet<BackendPaymentTotals>(`/cash/${cashId.replace(/:/g, "")}/sales-totals`);
  if (!res.ok) return { success: false, message: res.message };
  return { success: true, data: (res.data as any) ?? {} };
}

export async function getCashSummaryRemote(cashId: string): Promise<{ success: boolean; data?: { salesCount: number; salesTotal: string; byPayment: Record<string, string> }; message?: string }>{
  const user = getCurrentUser();
  if (!user?.token) return { success: false, message: "Usuário não autenticado" };
  const res = await apiGet<{ salesCount: number; salesTotal: string; byPayment: Record<string, string> }>(`/dashboard/cash/${encodeURIComponent(cashId.replace(/:/g, ""))}/summary`);
  if (!res.ok) return { success: false, message: res.message };
  return { success: true, data: res.data as any };
}

export async function getSalesSummaryPeriod(params: { from?: string; to?: string }): Promise<{
  success: boolean;
  data?: { totalSales: number | string; countClosed: number; byPayment: Record<string, { total: number | string; count: number }> };
  message?: string;
}> {
  const qs: string[] = [];
  if (params.from) qs.push(`from=${encodeURIComponent(params.from)}`);
  if (params.to) qs.push(`to=${encodeURIComponent(params.to)}`);
  const path = `/dashboard/sales-summary${qs.length ? `?${qs.join("&")}` : ""}`;
  const res = await apiGet<any>(path);
  if (!res.ok) return { success: false, message: res.message };
  return { success: true, data: res.data as any };
}

export async function openBox(payload: {
  usuario_responsavel: string;
  saldo_inicial_efetivo: number;
  saldo_inicial_cartao: number;
  observacoes?: string;
}): Promise<Caixa> {
  const items = read();
  const caixa: Caixa = {
    caixa_id: "caixa_" + Date.now().toString(36),
    data_abertura: nowISO(),
    usuario_responsavel: payload.usuario_responsavel,
    saldo_inicial_efetivo: payload.saldo_inicial_efetivo || 0,
    saldo_inicial_cartao: payload.saldo_inicial_cartao || 0,
    observacoes: payload.observacoes,
    status: "open",
    movements: [],
  };
  items.unshift(caixa);
  write(items);
  return caixa;
}

export async function getOpenBox(): Promise<Caixa | null> {
  // Sem persistência local; retornar null
  return null;
}

export async function addMovement(caixa_id: string, mov: Omit<Movimento, "id" | "data_hora">): Promise<Movimento> {
  // Mantido apenas para compatibilidade; sem persistência
  return {
    id: "mov_" + Date.now().toString(36),
    data_hora: nowISO(),
    ...mov,
  } as Movimento;
}

export async function listMovements(caixa_id: string): Promise<Movimento[]> {
  // Sem persistência local
  return [];
}

export async function getSummary(): Promise<CaixaSummary> {
  // Sem persistência local, retornar zeros
  return { totalIn: 0, totalOut: 0, balance: 0 };
}

export async function closeBox(caixa_id: string, payload: {
  usuario_responsavel_fechamento: string;
  saldo_final_efetivo: number;
  saldo_final_cartao: number;
  observacoes?: string;
}): Promise<{ success: boolean; caixa?: Caixa }> {
  // Sem persistência local, retornar sucesso simbólico
  return { success: true };
}
