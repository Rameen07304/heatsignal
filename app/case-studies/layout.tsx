import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Case Studies",
  description: "Three real heat and smog events replayed through HeatSignal with archived data.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
