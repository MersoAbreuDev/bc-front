import { LoginRequest, LoginResponse, ForgotPasswordRequest, ForgotPasswordResponse } from "@shared/api";

const AUTH_KEY = "bcomandas:auth";

function onlyDigits(v: string) { return (v||"").replace(/\D+/g,""); }

function getApiBase(): string {
  const base = import.meta.env.VITE_API_URL || "http://localhost:3000"
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
      if (data) {
        const raw = data.message || data.error;
        if (Array.isArray(raw)) message = raw.join("; ");
        else if (typeof raw === "string") message = raw;
      }
      message = message || `Erro ${res.status}`;
      return { success: false, message };
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
    const user = {
      token,
      docType,
      document: normalizedDocument,
      name: data?.name || data?.user?.name || "Operador",
      ...(tenantId ? { tenantId } : {}),
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return { success: true, token };
  } catch (e: any) {
    return { success: false, message: e?.message || "Falha ao conectar ao servidor" };
  }
}

export async function forgotPassword(payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  const { docType, document } = payload;
  if (!docType || !document) {
    return { success: false, message: "Informe documento ou email" };
  }
  const isEmail = docType === "email";
  const normalizedDocument = isEmail ? (document || "").trim() : onlyDigits(document);
  const isDocValid = isEmail ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedDocument) : normalizedDocument.length >= 11;
  if (!isDocValid) {
    return { success: false, message: "Documento ou email inválido" };
  }
  return { success: true, message: "Se existir uma conta, enviamos instruções de redefinição." };
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}
