"use client";

import { cn } from "@/lib/utils";

export function PokeballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("inline-block", className)} aria-hidden>
      <defs>
        <linearGradient id="pk-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id="pk-bot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#pk-bot)" stroke="#0F172A" strokeWidth="2" />
      <path d="M2 32 A30 30 0 0 1 62 32 L42 32 A10 10 0 0 0 22 32 Z" fill="url(#pk-top)" stroke="#0F172A" strokeWidth="2" />
      <line x1="2" y1="32" x2="22" y2="32" stroke="#0F172A" strokeWidth="2" />
      <line x1="42" y1="32" x2="62" y2="32" stroke="#0F172A" strokeWidth="2" />
      <circle cx="32" cy="32" r="9" fill="#F8FAFC" stroke="#0F172A" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="4" fill="#CBD5E1" stroke="#0F172A" strokeWidth="1.5" />
    </svg>
  );
}
