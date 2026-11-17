// Re-mounts on every navigation, so the CSS animation plays as a page transition.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-[page-in_0.2s_ease-out_both]">{children}</div>;
}
