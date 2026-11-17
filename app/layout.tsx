import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Header } from "@/components/header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "HeatSignal — Environmental Health Intelligence", template: "%s · HeatSignal" },
  description:
    "Compound climate-health early warning: heat stress, air quality and UV for any city, with AI alerts in English, Urdu and Arabic.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          <footer className="no-print mx-auto max-w-7xl border-t px-4 py-6 text-xs text-muted-foreground">
            Weather and air-quality data by{" "}
            <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            (CC BY 4.0). HeatSignal is a decision-support tool, not medical advice. Team HeatSignal — Kinnaird College
            for Women, Lahore.
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
