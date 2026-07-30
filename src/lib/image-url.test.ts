import { describe, expect, it } from "vitest";
import { rewriteS3MediaUrlsInHtml, resolveImageDisplayUrl } from "@/lib/image-url";

describe("rewriteS3MediaUrlsInHtml", () => {
  it("proxifie les images S3 amazonaws", () => {
    const src =
      "https://sdcreativ-bucket.s3.eu-west-3.amazonaws.com/blog/media/cover.png";
    const html = `<p><img src="${src}" alt="" /></p>`;
    expect(rewriteS3MediaUrlsInHtml(html)).toContain(
      `/api/media?url=${encodeURIComponent(src)}`,
    );
  });

  it("laisse les URLs non-S3 intactes", () => {
    const html = `<img src="/images/local.png" /><img src="https://cdn.example.com/a.jpg" />`;
    expect(rewriteS3MediaUrlsInHtml(html)).toBe(html);
  });
});

describe("resolveImageDisplayUrl", () => {
  it("proxifie une URL S3 blog", () => {
    const url =
      "https://bucket.s3.eu-west-3.amazonaws.com/blog/media/x.png";
    expect(resolveImageDisplayUrl(url)).toBe(
      `/api/media?url=${encodeURIComponent(url)}`,
    );
  });
});
