import { ImageResponse } from "next/og";
import {
  FALLBACK_MARK,
  faviconToDataUrl,
  loadSiteFaviconBytes,
} from "@/lib/site-favicon";

export const size = { width: 32, height: 32 };
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
          borderRadius: 8,
          color: "white",
          fontSize: 14,
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

function rasterIcon(dataUrl: string) {
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
          borderRadius: 6,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          width={26}
          height={26}
          style={{ objectFit: "contain" }}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}

export default async function Icon() {
  const payload = await loadSiteFaviconBytes({ preferRaster: true });
  if (!payload) return fallbackIcon();
  return rasterIcon(faviconToDataUrl(payload));
}
