/**
 * Design Tokens — Single source of truth for all UI styling.
 * Import these instead of hardcoding colors, sizes, and shadows.
 */

export const colors = {
  // Brand
  primary: '#1E3A5F',
  primaryLight: '#2A4F7F',
  primaryDark: '#152B47',
  accent: '#F59E0B',

  // Neutrals
  white: '#FFFFFF',
  bg: '#F8FAFC',
  bgAlt: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocus: '#1E3A5F',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  textInverse: '#FFFFFF',

  // Status
  success: '#059669',
  successBg: '#D1FAE5',
  successBorder: '#A7F3D0',
  successDark: '#065F46',

  warning: '#D97706',
  warningBg: '#FEF3C7',
  warningBorder: '#FDE68A',

  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  dangerBorder: '#FECACA',
  dangerDark: '#991B1B',

  info: '#2563EB',
  infoBg: '#DBEAFE',
  infoBorder: '#93C5FD',

  // Category colors
  purple: '#7C3AED',
  purpleBg: '#F3E8FF',
  purpleBorder: '#DDD6FE',

  orange: '#EA580C',
  orangeBg: '#FFF7ED',
  orangeBorder: '#FDBA74',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
} as const;

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '10px',
  xl: '12px',
  xxl: '16px',
  full: '50%',
} as const;

export const fontSize = {
  xs: '11px',
  sm: '12px',
  md: '13px',
  base: '14px',
  lg: '15px',
  xl: '16px',
  xxl: '20px',
  xxxl: '24px',
  heading: '28px',
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1)',
} as const;

/** Reusable inline style presets */
export const presets = {
  card: {
    background: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    border: `1px solid ${colors.border}`,
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '10px 14px',
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    outline: 'none',
    transition: 'border-color 0.2s',
    background: colors.white,
  } as React.CSSProperties,

  label: {
    display: 'block' as const,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: '6px',
  } as React.CSSProperties,

  pageTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extrabold,
    color: colors.textPrimary,
    letterSpacing: '-0.5px',
  } as React.CSSProperties,

  pageSubtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  } as React.CSSProperties,

  tableHeader: {
    textAlign: 'left' as const,
    padding: '10px 12px',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  tableCell: {
    padding: '12px',
    fontSize: fontSize.base,
    borderBottom: `1px solid ${colors.borderLight}`,
  } as React.CSSProperties,
} as const;
