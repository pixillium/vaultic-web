import { twMerge } from "tailwind-merge";
import { type ClassValue, clsx } from "clsx";
import { authenticator } from "otplib";

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
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
];
