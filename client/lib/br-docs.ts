import type { DocType } from "@shared/api";

export function onlyDigits(value: string): string {
  return (value || "").replace(/\D+/g, "");
}

export function formatCPF(value: string): string {
  const v = onlyDigits(value).slice(0, 11);
  const parts = [] as string[];
  if (v.length > 3) parts.push(v.slice(0, 3));
  if (v.length > 6) parts.push(v.slice(3, 6));
  if (v.length > 9) parts.push(v.slice(6, 9));
  let out = v;
  if (v.length > 9) out = `${v.slice(0, 9)}-${v.slice(9, 11)}`;
  if (v.length > 6 && v.length <= 9)
    out = `${v.slice(0, 6)}.${v.slice(6)}`;
  if (v.length > 3 && v.length <= 6)
    out = `${v.slice(0, 3)}.${v.slice(3)}`;
  if (v.length <= 3) out = v;
  if (v.length > 6 && v.length <= 9) out = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  if (v.length > 9) out = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9, 11)}`;
  return out;
}

export function formatCNPJ(value: string): string {
  const v = onlyDigits(value).slice(0, 14);
  if (v.length <= 2) return v;
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  if (v.length <= 12)
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`;
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12, 14)}`;
}

export function isValidCPF(cpf: string): boolean {
  const v = onlyDigits(cpf);
  if (v.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(v)) return false; // all same digits
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(v.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(v.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(v.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === parseInt(v.charAt(10));
}

export function isValidCNPJ(cnpj: string): boolean {
  const v = onlyDigits(cnpj);
  if (v.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(v)) return false;
  const calc = (factorList: number[], len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(v.charAt(i)) * factorList[i];
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], 12);
  if (d1 !== parseInt(v.charAt(12))) return false;
  const d2 = calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], 13);
  return d2 === parseInt(v.charAt(13));
}

export function formatDocumentByType(docType: DocType, value: string): string {
  if (docType === "email") return (value || "").trim();
  return docType === "cpf" ? formatCPF(value) : formatCNPJ(value);
}

export function isValidDocument(docType: DocType, value: string): boolean {
  if (docType === "email") {
    const v = (value || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  return docType === "cpf" ? isValidCPF(value) : isValidCNPJ(value);
}
