import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trends",
  description: "How summer heat stress has changed in your city over the last five years, from archived weather data.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
