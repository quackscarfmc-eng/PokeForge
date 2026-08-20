import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PokeForge — Custom Pokémon Editor for pokeemerald-expansion",
  description:
    "Add fully custom Pokémon, moves, types, abilities, items and status conditions to your pokeemerald-expansion ROM hack — safely, with validation, dry-run plans, backups and build checks.",
  keywords: [
    "pokeemerald-expansion",
    "pokemon romhack",
    "custom pokemon",
    "gba decompilation",
    "pokemon editor",
  ],
  authors: [{ name: "PokeForge" }],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}
