import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety Advisor",
  description: "Should your outdoor event or school activity go ahead? A go, adjust or postpone check up to a week ahead.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
