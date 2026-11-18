import { ImageResponse } from "next/og";

// App icons for the install prompt, drawn from the logo (four signal bars in the risk colours) at build time.
export const dynamic = "force-static";
export const generateStaticParams = () => [{ size: "192" }, { size: "512" }];

const BARS = [
  { h: 0.33, color: "#16a34a" },
  { h: 0.56, color: "#eab308" },
  { h: 0.78, color: "#f97316" },
  { h: 1, color: "#dc2626" },
];

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = (await params).size === "192" ? 192 : 512;
  // Keep the bars inside the central 60 %, the safe zone for maskable icons.
  const box = size * 0.5;
  const bar = box * 0.19;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        <div style={{ width: box, height: box, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          {BARS.map((b) => (
            <div key={b.color} style={{ width: bar, height: box * b.h, background: b.color, borderRadius: bar * 0.28 }} />
          ))}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
