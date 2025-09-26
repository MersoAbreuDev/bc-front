export interface Produto {
  id: string;
  name: string;
  brand?: string;
  price: number; // em reais (number)
  categoryId?: string;
  active?: boolean;
}

import { getCurrentUser } from "@/services/auth/api";

function getApiBase(): string {
  const base = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:3000";
  return String(base || "http://localhost:3000").replace(/\/$/, "");
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

function mapBackendToProduto(p: any): Produto {
  return {
    id: p?.id,
    name: p?.name,
    brand: p?.brand,
    price: Number(p?.price || 0),
    categoryId: p?.category?.id || p?.categoryId,
  } as Produto;
}

export async function listProducts(): Promise<Produto[]> {
  const res = await apiGet<any[]>(`/products`);
  if (!res.ok) throw new Error(res.message || "Falha ao listar produtos");
  const list = Array.isArray(res.data) ? res.data : [];
  return list.map(mapBackendToProduto);
}

export async function getProduct(id: string): Promise<Produto> {
  const res = await apiGet<any>(`/products/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(res.message || "Falha ao obter produto");
  return mapBackendToProduto(res.data);
}

export async function createProduct(payload: { name: string; brand?: string; price: number; categoryId: string }): Promise<Produto> {
  const body: any = {
    name: payload.name,
    price: Number(payload.price || 0).toFixed(2),
    categoryId: payload.categoryId,
  };
  if (payload.brand) body.brand = payload.brand;
  const res = await apiSend<any>(`/products`, "POST", body);
  if (!res.ok) throw new Error(res.message || "Falha ao criar produto");
  return mapBackendToProduto(res.data);
}

export async function updateProduct(id: string, payload: { name?: string; brand?: string; price?: number; categoryId?: string }): Promise<Produto> {
  const body: any = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.brand !== undefined) body.brand = payload.brand;
  if (payload.price !== undefined) body.price = Number(payload.price || 0).toFixed(2);
  if (payload.categoryId !== undefined) body.categoryId = payload.categoryId;
  const res = await apiSend<any>(`/products/${encodeURIComponent(id)}`, "PATCH", body);
  if (!res.ok) throw new Error(res.message || "Falha ao atualizar produto");
  return mapBackendToProduto(res.data);
}

export async function deleteProduct(id: string): Promise<{ success: boolean }>{
  const res = await apiSend<{ success: boolean }>(`/products/${encodeURIComponent(id)}`, "DELETE");
  if (!res.ok) throw new Error(res.message || "Falha ao excluir produto");
  return { success: true };
}
