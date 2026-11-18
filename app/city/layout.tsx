import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "City Forecast",
  description: "Hour-by-hour heat stress, air quality and UV for one city, with safe hours to be outside.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
