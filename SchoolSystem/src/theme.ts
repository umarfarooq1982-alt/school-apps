export const colors = {
  primary: '#E8701E',
  primaryText: '#B4530F',
  primarySoft: '#FCEBDD',
  bg: '#F8F5F2',
  card: '#FFFFFF',
  border: '#ECE6E0',
  borderStrong: '#D9D2CB',
  text: '#141210',
  textMuted: '#6E6862',
  textFaint: '#A39C95',
  success: '#1E7A3C',
  successSoft: '#E2F3E7',
  danger: '#C62828',
  dangerSoft: '#FBE5E5',
  info: '#1F4FC9',
  infoSoft: '#E5EDFB',
  warn: '#B4530F',
  warnSoft: '#FCEFE3',
  neutralSoft: '#EEEAE6',
  white: '#FFFFFF',
  dark: '#1A1412',
};

export type Tone = 'success' | 'danger' | 'warn' | 'info' | 'neutral' | 'primary';

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: colors.success, bg: colors.successSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  warn: { fg: colors.warn, bg: colors.warnSoft },
  info: { fg: colors.info, bg: colors.infoSoft },
  neutral: { fg: colors.textMuted, bg: colors.neutralSoft },
  primary: { fg: colors.white, bg: colors.primary },
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
