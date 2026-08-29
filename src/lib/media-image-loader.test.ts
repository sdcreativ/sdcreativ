import { describe, expect, it } from "vitest";
import { mediaImageLoader, snapMediaWidth } from "@/lib/media-image-loader";

describe("snapMediaWidth", () => {
  it("arrondit à la largeur catalogue supérieure", () => {
    expect(snapMediaWidth(80)).toBe(80);
    expect(snapMediaWidth(81)).toBe(96);
    expect(snapMediaWidth(160)).toBe(160);
    expect(snapMediaWidth(2000)).toBe(1920);
  });
});

describe("mediaImageLoader", () => {
  it("ajoute w et q sur /api/media", () => {
    const src =
      "/api/media?url=" +
      encodeURIComponent("https://bucket.s3.eu-west-3.amazonaws.com/site/media/a.jpg");
    const out = mediaImageLoader({ src, width: 160, quality: 70 });
    expect(out).toContain("w=160");
    expect(out).toContain("q=70");
    expect(out).toContain("url=");
  });

  it("laisse intacte une URL locale", () => {
    expect(mediaImageLoader({ src: "/images/team/a.png", width: 80 })).toBe(
      "/images/team/a.png",
    );
  });
});
