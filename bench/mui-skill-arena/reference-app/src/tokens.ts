/** Fixed hexes used where CSS variables cannot be consumed (SVG attributes, gradients). */
export const C = {
  brand: '#4F46E5',
  brandSoft: '#818CF8',
  brandDark: '#3730A3',
  teal: '#0EA5A4',
  amber: '#F59E0B',
  green: '#16A34A',
  rose: '#E11D48',
  slate: '#94A3B8',
  ink: '#0F172A',
};

/** Theme-aware translucent tints, built from MUI CSS variable channels. */
const tint = (role: string, alpha: number) =>
  `rgb(var(--mui-palette-${role}-mainChannel) / ${alpha})`;

export const T = {
  primaryTint: tint('primary', 0.09),
  primaryTintStrong: tint('primary', 0.16),
  successTint: tint('success', 0.12),
  errorTint: tint('error', 0.1),
  warningTint: tint('warning', 0.14),
  neutralTint: 'rgb(var(--mui-palette-text-primaryChannel) / 0.05)',
  fieldBg: 'rgb(var(--mui-palette-text-primaryChannel) / 0.03)',
};
