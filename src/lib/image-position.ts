const POSITION_RE = /^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/;

export const DEFAULT_IMAGE_POSITION = "50% 0%";

export function parseImagePosition(value?: string | null): { x: number; y: number } {
  if (!value) return { x: 50, y: 0 };
  const match = value.match(POSITION_RE);
  if (!match) return { x: 50, y: 0 };
  return { x: Number(match[1]), y: Number(match[2]) };
}

export function formatImagePosition(x: number, y: number): string {
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
  return `${clamp(x)}% ${clamp(y)}%`;
}

export function normalizeImagePosition(value?: string | null): string {
  if (!value) return DEFAULT_IMAGE_POSITION;
  const parsed = parseImagePosition(value);
  return formatImagePosition(parsed.x, parsed.y);
}
