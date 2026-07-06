import { ImageResponse } from "next/og";
import { SITE } from "@/lib/constants";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #003d66 0%, #0072B5 50%, #005a8f 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
              color: "#0072B5",
            }}
          >
            SD
          </div>
          <span
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            {SITE.name}
          </span>
        </div>
        <p
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.85)",
            maxWidth: 800,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {SITE.tagline}
        </p>
        <div
          style={{
            marginTop: 40,
            padding: "12px 32px",
            borderRadius: 999,
            background: "#E31E24",
            color: "white",
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          Abidjan · Côte d&apos;Ivoire
        </div>
      </div>
    ),
    { ...size },
  );
}
