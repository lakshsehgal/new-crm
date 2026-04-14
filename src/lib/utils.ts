import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

export function formatMoney(
  value: number | string | null | undefined,
  currency: string = "INR",
): string {
  const n = Number(value ?? 0);
  const locale = LOCALE_BY_CURRENCY[currency] ?? "en-IN";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(0)}`;
  }
}

export function initials(name?: string | null, email?: string | null): string {
  const src = name?.trim() || email?.split("@")[0] || "?";
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  const out = parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return out || src[0]!.toUpperCase();
}
