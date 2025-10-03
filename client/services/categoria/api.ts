export interface Categoria { id: string; name: string; active?: boolean }

import { getCurrentUser } from "@/services/auth/api";

function getApiBase(): string {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5337"
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

export async function listCategories(): Promise<Categoria[]> {
  const res = await apiGet<Categoria[]>(`/categories`);
  if (!res.ok) throw new Error(res.message || "Falha ao listar categorias");
  return (res.data as any) || [];
}

export async function getCategory(id: string): Promise<Categoria> {
  const res = await apiGet<Categoria>(`/categories/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(res.message || "Falha ao obter categoria");
  return res.data as any;
}

export async function createCategory(payload: { name: string; active?: boolean }): Promise<Categoria> {
  const res = await apiSend<Categoria>(`/categories`, "POST", payload);
  if (!res.ok) throw new Error(res.message || "Falha ao criar categoria");
  return res.data as any;
}

export async function updateCategory(id: string, payload: { name?: string; active?: boolean }): Promise<Categoria> {
  const res = await apiSend<Categoria>(`/categories/${encodeURIComponent(id)}`, "PATCH", payload);
  if (!res.ok) throw new Error(res.message || "Falha ao atualizar categoria");
  return res.data as any;
}

export async function deleteCategory(id: string): Promise<{ success: boolean }>{
  const res = await apiSend<{ success: boolean }>(`/categories/${encodeURIComponent(id)}`, "DELETE");
  if (!res.ok) throw new Error(res.message || "Falha ao excluir categoria");
  return { success: true };
}
