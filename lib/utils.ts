import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ur-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("ur-PK", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(date));
}
