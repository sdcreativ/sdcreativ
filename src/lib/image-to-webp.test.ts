import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  convertRasterToWebp,
  prepareImageForStorage,
  withWebpFilename,
} from "@/lib/image-to-webp";

async function tinyPng(): Promise<Buffer> {
  return sharp({
    create: { width: 12, height: 8, channels: 3, background: "#0072b5" },
  })
    .png()
    .toBuffer();
}

describe("withWebpFilename", () => {
  it("remplace les extensions raster", () => {
    expect(withWebpFilename("photo.JPG")).toBe("photo.webp");
    expect(withWebpFilename("a.png")).toBe("a.webp");
    expect(withWebpFilename("deja.webp")).toBe("deja.webp");
  });
});

describe("prepareImageForStorage", () => {
  it("convertit un PNG en WebP", async () => {
    const png = await tinyPng();
    const result = await prepareImageForStorage(png, "hero.png", "image/png");
    expect(result.contentType).toBe("image/webp");
    expect(result.filename).toBe("hero.webp");
    expect((await sharp(result.buffer).metadata()).format).toBe("webp");
    expect(result.buffer.byteLength).toBeLessThan(png.byteLength + 64);
  });

  it("laisse un SVG intact", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>',
    );
    const result = await prepareImageForStorage(svg, "logo.svg", "image/svg+xml");
    expect(result.contentType).toBe("image/svg+xml");
    expect(result.filename).toBe("logo.svg");
    expect(result.buffer.equals(svg)).toBe(true);
  });
});

describe("convertRasterToWebp", () => {
  it("redimensionne si maxWidth est fourni", async () => {
    const png = await sharp({
      create: { width: 400, height: 200, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    const converted = await convertRasterToWebp(png, { maxWidth: 160, quality: 70 });
    expect(converted).not.toBeNull();
    const meta = await sharp(converted!.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(160);
  });
});
