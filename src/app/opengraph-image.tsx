import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { config } from "@/config";

export const alt = `${config.appName} · ${config.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The renderer behind next/og only decodes PNG, JPEG, GIF and SVG, so the companion is a PNG copy
// of public/reed/companion.webp kept in a private folder (_og is not a route).
const companionData = await readFile(join(process.cwd(), "src/app/_og/companion.png"), "base64");
const companionSrc = `data:image/png;base64,${companionData}`;

// Paper background and ink colors from globals.css (light theme).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px 0 96px",
          background: "#f3ecdf",
          color: "#1f2a22",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div style={{ fontSize: 168, lineHeight: 1, letterSpacing: -6, color: "#2f5d46" }}>
            {config.appName}
          </div>
          <div style={{ marginTop: 28, fontSize: 48, lineHeight: 1.2, color: "#1f2a22" }}>
            {config.tagline}
          </div>
        </div>
        <img src={companionSrc} width={421} height={520} alt="" />
      </div>
    ),
    { ...size },
  );
}
