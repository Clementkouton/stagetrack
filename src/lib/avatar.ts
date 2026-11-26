/**
 * Avatar StageTrack — SVG de marque généré à partir du nom (et du titre).
 * ---------------------------------------------------------------
 * « Valider l'avatar automatique » de l'onboarding : produit une image
 * SVG encodée en data URL (stockable dans User.avatarUrl) avec les initiales
 * sur fond dégradé vert académique #0B393C → #1D5A50 et liseré or #B8A02E.
 */

const PALETTES: Array<{ from: string; to: string; accent: string }> = [
  { from: "#0B393C", to: "#1D5A50", accent: "#B8A02E" },
  { from: "#134E4A", to: "#0B393C", accent: "#D9B83E" },
  { from: "#1D5A50", to: "#0B393C", accent: "#B8A02E" },
  { from: "#0B393C", to: "#255F5A", accent: "#E3C85A" },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function initialsOfName(fullName: string): string {
  return (
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "ST"
  );
}

/** Data URL « data:image/svg+xml,… » d'un avatar d'initiales aux couleurs StageTrack. */
export function avatarSvgDataUrl(fullName: string, title?: string | null): string {
  const initials = initialsOfName(fullName);
  const palette = PALETTES[hashString(fullName + (title ?? "")) % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette.from}"/><stop offset="1" stop-color="${palette.to}"/></linearGradient></defs><rect width="240" height="240" rx="120" fill="url(#bg)"/><circle cx="120" cy="104" r="76" fill="none" stroke="${palette.accent}" stroke-width="4" opacity="0.85"/><text x="120" y="126" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700" fill="#FFFFFF" letter-spacing="2">${initials}</text><circle cx="196" cy="46" r="7" fill="${palette.accent}" opacity="0.9"/><circle cx="44" cy="196" r="5" fill="${palette.accent}" opacity="0.7"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Limite raisonnable pour une photo de profil encodée en data URL. */
export const AVATAR_MAX_BYTES = 10_000_000;
