import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function levelFromXp(xp: number) {
  return Math.floor(xp / 500) + 1;
}

export function xpProgressInLevel(xp: number) {
  return xp % 500;
}
