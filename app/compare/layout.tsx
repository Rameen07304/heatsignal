import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Cities",
  description: "Two cities side by side: heat stress, air quality and combined risk for the next three days.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
