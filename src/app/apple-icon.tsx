import { ImageResponse } from "next/og";
import { FALLBACK_MARK, loadSiteFaviconBytes } from "@/lib/site-favicon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const revalidate = 300;

function fallbackIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: FALLBACK_MARK.background,
          borderRadius: 36,
          color: "white",
          fontSize: 72,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {FALLBACK_MARK.label}
      </div>
    ),
    { ...size },
  );
}

export default async function AppleIcon() {
  const payload = await loadSiteFaviconBytes({ preferRaster: true });
  if (!payload) {
    return fallbackIcon();
  }

  const base64 = Buffer.from(payload.body).toString("base64");
  const dataUrl = `data:${payload.contentType};base64,${base64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1628",
          borderRadius: 36,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          width={140}
          height={140}
          style={{ objectFit: "contain" }}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
