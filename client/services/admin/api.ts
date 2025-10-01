import { getCurrentUser } from "@/services/auth/api";

function getApiBase(): string {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5337"
  return "https://api.bcomandas.com.br";
}

function getAuthHeaders() {
  const user = getCurrentUser() as any;
  const token = user?.token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (user?.tenantId) headers["x-tenantid"] = String(user.tenantId);
  return headers;
}

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data?: T; message?: string }>{
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), ...getAuthHeaders() },
  });
  let data: any;
  try { data = await res.json(); } catch { /* noop */ }
  if (!res.ok) {
    const msg = (data?.message || data?.error || `Erro ${res.status}`);
    return { ok: false, status: res.status, data, message: msg };
  }
  return { ok: true, status: res.status, data };
}

// Users
export async function listUsers() { const r = await api<any[]>(`/users`, { method: "GET" }); if (!r.ok) throw new Error(r.message); return r.data || []; }
export async function getUser(id: string) { const r = await api<any>(`/users/${encodeURIComponent(id)}`, { method: "GET" }); if (!r.ok) throw new Error(r.message); return r.data; }
export async function createUser(body: any) { const r = await api<any>(`/users`, { method: "POST", body: JSON.stringify(body) }); if (!r.ok) throw new Error(r.message); return r.data; }
export async function updateUser(id: string, body: any) { const r = await api<any>(`/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }); if (!r.ok) throw new Error(r.message); return r.data; }
export async function deleteUser(id: string) { const r = await api<any>(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }); if (!r.ok) throw new Error(r.message); return { success: true }; }

// Tenants
export async function listTenants() { const r = await api<any[]>(`/tenants`, { method: "GET" }); if (!r.ok) throw new Error(r.message); return r.data || []; }
export async function getTenant(id: string) { const r = await api<any>(`/tenants/${encodeURIComponent(id)}`, { method: "GET" }); if (!r.ok) throw new Error(r.message); return r.data; }
export async function createTenant(body: any) { const r = await api<any>(`/tenants`, { method: "POST", body: JSON.stringify(body) }); if (!r.ok) throw new Error(r.message); return r.data; }
export async function updateTenant(id: string, body: any) { const r = await api<any>(`/tenants/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }); if (!r.ok) throw new Error(r.message); return r.data; }
export async function deleteTenant(id: string) { const r = await api<any>(`/tenants/${encodeURIComponent(id)}`, { method: "DELETE" }); if (!r.ok) throw new Error(r.message); return { success: true }; }

// Register tenant + admin user in one call
export async function registerTenant(body: any) {
  const r = await api<any>(`/tenants/register`, { method: "POST", body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.message);
  return r.data;
}

// Extra tenants endpoints (opcionais)
export async function tenantsStatistics() { const r = await api<any>(`/tenants/statistics`, { method: "GET" }); if (!r.ok) throw new Error(r.message); return r.data; }
export async function tenantsSearch(q: string) { const r = await api<any[]>(`/tenants/search?q=${encodeURIComponent(q)}`, { method: "GET" }); if (!r.ok) throw new Error(r.message); return r.data || []; }
export async function tenantsByStatus(status: string) { const r = await api<any[]>(`/tenants/status/${encodeURIComponent(status)}`, { method: "GET" }); if (!r.ok) throw new Error(r.message); return r.data || []; }
export async function tenantsOverdue() { const r = await api<any[]>(`/tenants/overdue`, { method: "GET" }); if (!r.ok) throw new Error(r.message); return r.data || []; }
export async function tenantActivate(id: string) { const r = await api<any>(`/tenants/${encodeURIComponent(id)}/activate`, { method: "POST" }); if (!r.ok) throw new Error(r.message); return r.data; }
export async function tenantSuspend(id: string, reason?: string) { const r = await api<any>(`/tenants/${encodeURIComponent(id)}/suspend`, { method: "POST", body: JSON.stringify({ reason }) }); if (!r.ok) throw new Error(r.message); return r.data; }
export async function tenantBlock(id: string, reason?: string) { const r = await api<any>(`/tenants/${encodeURIComponent(id)}/block`, { method: "POST", body: JSON.stringify({ reason }) }); if (!r.ok) throw new Error(r.message); return r.data; }
export async function tenantChangePlan(id: string, plan: string, monthlyFee: number) { const r = await api<any>(`/tenants/${encodeURIComponent(id)}/change-plan`, { method: "POST", body: JSON.stringify({ plan, monthlyFee }) }); if (!r.ok) throw new Error(r.message); return r.data; }

// List users of a tenant (best-effort with fallbacks)
export async function listTenantUsers(tenantId: string): Promise<any[]> {
  // Preferred endpoint: /tenants/:id/users
  let r = await api<any[]>(`/tenants/${encodeURIComponent(tenantId)}/users`, { method: "GET" });
  if (r.ok && Array.isArray(r.data)) return r.data as any[];
  // Fallback: /users?tenantId=...
  r = await api<any[]>(`/users?tenantId=${encodeURIComponent(tenantId)}`, { method: "GET" });
  if (r.ok && Array.isArray(r.data)) return r.data as any[];
  // Fallback: /users (filter client-side if tenant id available)
  r = await api<any[]>(`/users`, { method: "GET" });
  if (r.ok && Array.isArray(r.data)) {
    const arr = (r.data as any[]).filter((u: any) => (u?.tenantId || u?.tenant?.id) === tenantId);
    return arr;
  }
  return [];
}

// Upload logo (multipart/form-data) after tenant is created/updated
export async function uploadTenantLogo(tenantId: string, file: File): Promise<any> {
  const base = getApiBase();
  const user = getCurrentUser() as any;
  const fd = new FormData();
  fd.append("logo", file, file.name);
  const headers: Record<string, string> = {};
  if (user?.token) headers["Authorization"] = `Bearer ${user.token}`;
  if (user?.tenantId) headers["x-tenantid"] = String(user.tenantId);
  const res = await fetch(`${base}/tenants/${encodeURIComponent(tenantId)}/logo`, { method: "POST", headers, body: fd });
  let data: any;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const msg = data?.message || data?.error || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return data;
}


