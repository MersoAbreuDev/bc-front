/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type DocType = "cpf" | "cnpj" | "email";

export interface LoginRequest {
  docType: DocType;
  document: string; // cpf/cnpj (apenas dígitos) ou email completo
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export interface ForgotPasswordRequest {
  docType: DocType;
  document: string; // cpf/cnpj (apenas dígitos) ou email completo
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}
