import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workforce Risk",
  description: "Where outdoor work is safe today by industry, when to schedule shifts, and what the heat costs in lost hours.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
