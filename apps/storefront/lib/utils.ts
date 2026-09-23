import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncate(value?: string, length?: number) {
  if (!value || !length) return "";
  return value.length <= length ? value : `${value.substring(0, length)}...`;
}
