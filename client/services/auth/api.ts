import { LoginRequest, LoginResponse, ForgotPasswordRequest, ForgotPasswordResponse } from "@shared/api";

const AUTH_KEY = "bcomandas:auth";

function onlyDigits(v: string) { return (v||"").replace(/\D+/g,""); }

function getApiBase(): string {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5337"
  return base.replace(/\/$/, "")
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { docType, document, password } = payload;
  if (!docType || !document || password.length < 6) {
    return { success: false, message: "Credenciais inválidas" };
  }

  const isEmail = docType === "email";
  const normalizedDocument = isEmail ? (document || "").trim() : onlyDigits(document);
  const isDocValid = isEmail ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedDocument) : normalizedDocument.length >= 11;
  if (!isDocValid) {
    return { success: false, message: "Documento ou email inválido" };
  }

  // Chamada à API remota (Nest/Express)
  try {
    const base = getApiBase();
    const url = `${base}/auth/login`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        acesso: normalizedDocument,
        password,
      }),
    });

    const data: any = await (async () => { try { return await res.json(); } catch { return undefined; } })();
    if (!res.ok) {
      let message: string | undefined;
      let code: string | undefined;
      let status: string | undefined;
      let support: string | undefined;
      if (data) {
        const raw = data.message || data.error;
        if (Array.isArray(raw)) message = raw.join("; ");
        else if (typeof raw === "string") message = raw;
        code = data.code;
        status = data.status;
        support = data.support;
      }
      message = message || `Erro ${res.status}`;
      return { success: false, message, code, status: status as any, support } as any;
    }

    const token: string | undefined = data?.token || data?.accessToken || data?.access_token;
    if (!token) {
      return { success: false, message: data?.message || "Token não retornado pelo servidor" };
    }
    const tenantId: string | undefined =
      data?.tenantId ||
      data?.tenant_id ||
      data?.tenant?.id ||
      data?.user?.tenantId ||
      data?.user?.tenant?.id;
    // tenta obter role do payload de resposta ou do token JWT
    const decodedRole = (() => {
      try {
        const part = token.split(".")[1];
        if (!part) return undefined;
        const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
        return payload?.role || payload?.roles?.[0] || payload?.["https://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      } catch { return undefined; }
    })();

    const user = {
      token,
      docType,
      document: normalizedDocument,
      name: data?.name || data?.user?.name || "Operador",
      ...(data?.role || data?.user?.role || decodedRole ? { role: (data?.role || data?.user?.role || decodedRole) } : {}),
      ...(tenantId ? { tenantId } : {}),
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    const status: any = data?.status || data?.tenantStatus || data?.user?.tenant?.status;
    const support: any = data?.support;
    const tenantWarning: any = data?.tenantWarning;
    return { success: true, token, status, support, tenantWarning } as any;
  } catch (e: any) {
    return { success: false, message: e?.message || "Falha ao conectar ao servidor" };
  }
}

export async function forgotPassword(payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  const acesso = String(payload?.document || "").trim();
  if (!acesso) return { success: false, message: "Informe seu login de acesso" };
  try {
    const base = getApiBase();
    const url = `${base}/password-reset/request`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acesso }),
    });
    const data: any = await (async () => { try { return await res.json(); } catch { return undefined; } })();
    if (!res.ok) {
      const msg = data?.message || `Erro ${res.status}`;
      return { success: false, message: msg };
    }
    return { success: true, message: data?.message || "Se existir uma conta, enviamos instruções de redefinição." };
  } catch (e: any) {
    return { success: false, message: e?.message || "Falha ao solicitar redefinição" };
  }
}

export async function performPasswordReset(params: { acesso: string; token: string; password: string }): Promise<{ success: boolean; message?: string }>{
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/password-reset/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acesso: params.acesso, token: params.token, password: params.password }),
    });
    const data: any = await (async () => { try { return await res.json(); } catch { return undefined; } })();
    if (!res.ok) {
      const msg = data?.message || `Erro ${res.status}`;
      return { success: false, message: msg };
    }
    return { success: true, message: data?.message || "Senha alterada com sucesso" };
  } catch (e: any) {
    return { success: false, message: e?.message || "Falha ao redefinir senha" };
  }
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const u = JSON.parse(raw);
    if (!u?.role && u?.token) {
      try {
        const part = String(u.token).split(".")[1];
        if (part) {
          const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
          const role = payload?.role || payload?.roles?.[0] || payload?.["https://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
          if (role) {
            u.role = role;
            localStorage.setItem(AUTH_KEY, JSON.stringify(u));
          }
        }
      } catch { /* ignore */ }
    }
    return u;
  } catch {
    return null;
  }
}
