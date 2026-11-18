import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "First Aid",
  description: "Someone unwell in the heat? Answer a few questions and get clear first-aid steps and emergency numbers.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
