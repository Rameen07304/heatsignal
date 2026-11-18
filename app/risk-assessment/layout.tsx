import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Risk Assessment",
  description: "Your own heat and air-pollution risk today, based on your age, health and what you plan to do.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
