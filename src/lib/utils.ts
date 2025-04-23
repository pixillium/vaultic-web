import { twMerge } from "tailwind-merge";
import { type ClassValue, clsx } from "clsx";
import { authenticator } from "otplib";

import base32Decode from "base32-decode";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateOTP(secret: string): string {
  try {
    return authenticator.generate(secret);
  } catch (error) {
    console.error("Error generating code:", error);
    return "Invalid";
  }
}

export function getRemainingSeconds(): number {
  const now = Math.floor(Date.now() / 1000);
  return 30 - (now % 30);
}

export function formatRemainingTime(seconds: number): string {
  return seconds < 10 ? `0${seconds}` : `${seconds}`;
}

export const DEFAULT_GROUP_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
];

export function validateSecret(secret: string) {
  const cleaned = secret.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z2-7]+=*$/.test(cleaned)) return false;

  try {
    const decoded = new Uint8Array(base32Decode(cleaned, "RFC4648"));
    return decoded.length >= 10;
  } catch {
    return false;
  }
}
