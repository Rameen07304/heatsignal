import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { EarlyWarningBanner } from "@/components/early-warning-banner";
import { Header } from "@/components/header";
import { SosButton } from "@/components/sos-button";
import { LanguageProvider } from "@/lib/i18n";
import { CitiesProvider } from "@/lib/use-cities";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://heatsignal-rho.vercel.app"),
  title: { default: "HeatSignal: Environmental Health Intelligence", template: "%s · HeatSignal" },
  description:
    "Real-time heat stress, air quality and UV monitoring with health recommendations for 100+ cities worldwide.",
  keywords: ["heat stress", "WBGT", "air quality", "environmental health", "public health", "climate", "UV index"],
  openGraph: {
    title: "HeatSignal",
    description: "Know the environmental health risks before you step outside.",
    type: "website",
    url: "https://heatsignal-rho.vercel.app",
    siteName: "HeatSignal",
  },
  icons: { apple: "/pwa-icon/192" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LanguageProvider>
            <CitiesProvider>
              <Header />
              <SosButton />
              <div className="min-w-0 lg:ms-60">
                <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
                  <EarlyWarningBanner />
                  {children}
                </main>
                <footer className="no-print mx-auto max-w-[1400px] border-t px-4 pb-24 pt-6 text-xs text-muted-foreground lg:px-8">
                  Weather and air-quality data by{" "}
                  <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                    Open-Meteo
                  </a>{" "}
                  (CC BY 4.0). HeatSignal is a decision-support tool, not medical advice. Team HeatSignal, Kinnaird College
                  for Women, Lahore.
                </footer>
              </div>
            </CitiesProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
