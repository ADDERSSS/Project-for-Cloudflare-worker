import { hashString } from './ai';

export async function domainToAccent(domain: string): Promise<string> {
  const hash = await hashString(domain.toLowerCase());
  const hue = parseInt(hash.slice(0, 4), 16) % 360;
  const saturation = 60 + (parseInt(hash.slice(4, 6), 16) % 8);
  const lightness = 52 + (parseInt(hash.slice(6, 8), 16) % 8);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export async function resolveAccentColor(url: string, themeColor?: string | null): Promise<string> {
  if (themeColor) return themeColor;
  return domainToAccent(new URL(url).hostname);
}
