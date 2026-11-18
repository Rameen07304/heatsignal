import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Health Advisor",
  description: "What today's sunlight, air and heat mean for vitamin D, hydration, lungs and skin.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
