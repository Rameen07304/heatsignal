import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Worker Safety",
  description: "Safe work and rest times, water needs and a printable site notice for outdoor workers.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
