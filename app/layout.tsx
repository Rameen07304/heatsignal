import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Header } from "@/components/header";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: { default: "HeatSignal — Heat-illness early warning", template: "%s · HeatSignal" },
  description:
    "Real-time WBGT heat stress monitoring and AI-powered heat-health alerts for any city worldwide.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} min-h-screen font-[family-name:var(--font-geist-sans)] antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground">
            Weather data by{" "}
            <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            (CC BY 4.0). HeatSignal is a decision-support tool, not medical advice.
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
