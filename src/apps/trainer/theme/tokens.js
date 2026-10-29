// ============================================================
// Trainer Mobile Application
// ShiftEaze-Inspired Enterprise Visual Theme
// "Calm Intelligence for Workforce Operations"
// ============================================================
//
// IMPORTANT:
// This file contains VISUAL DESIGN TOKENS ONLY.
//
// It must NOT contain:
// - business logic
// - workflow logic
// - API logic
// - application state
// - feature logic
//
// The Trainer Mobile Application remains the product.
// ShiftEaze provides the visual design language.
// ============================================================


/**
 * ============================================================
 * COLOR SYSTEM
 * ============================================================
 */

export const COLOR = {
  // ----------------------------------------------------------
  // ShiftEaze Brand Identity
  // ----------------------------------------------------------

  brandPrimary: "#262B75",
  brandPrimaryHover: "#1E2260",
  brandNavy: "#14142C",
  brandLiveBar: "#171738",
  brandIris: "#4F46E5",
  brandIrisLight: "#EEF2FF",
  brandCrimson: "#B3261E",
  brandCrimsonLight: "#FDF2F2",

  // ----------------------------------------------------------
  // Primary Scale
  // ----------------------------------------------------------

  primary: "#262B75",
  primaryHover: "#1E2260",
  primaryDark: "#14142C",

  primarySoft: "#EEF2FF",

  primary900: "#0F172A",
  primary800: "#262B75",
  primary700: "#31388E",
  primary600: "#4F46E5",
  primary500: "#6366F1",
  primary300: "#A5B4FC",
  primary200: "#C7D2FE",
  primary100: "#EEF2FF",
  primary050: "#F8FAFC",

  // ----------------------------------------------------------
  // Neutral / Typography System
  // ----------------------------------------------------------

  ink950: "#0F172A",
  ink900: "#1E293B",
  ink800: "#334155",
  ink700: "#475569",
  ink600: "#64748B",
  ink500: "#94A3B8",
  ink400: "#CBD5E1",
  ink300: "#E2E8F0",
  ink200: "#F1F5F9",
  ink100: "#F8FAFC",

  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  textWhite: "#FFFFFF",

  // ----------------------------------------------------------
  // App Surfaces
  // ----------------------------------------------------------

  surface: "#F8FAFC",
  appBg: "#F8FAFC",

  white: "#FFFFFF",
  cardBg: "#FFFFFF",

  surfaceMuted: "#F1F5F9",
  secondarySurface: "#F1F5F9",

  border: "#E2E8F0",
  borderStrong: "#CBD5E1",

  selected: "#EEF2FF",
  pressed: "#E0E7FF",

  // ----------------------------------------------------------
  // Semantic Status Colors
  // ----------------------------------------------------------

  // Success / Confirmed / Completed
  success: "#137A3F",
  successLight: "#E3F6EA",
  successBorder: "#28A862",

  // Warning / Pending / Needs Attention
  warning: "#9A5B06",
  warningLight: "#FEF2E0",
  warningBorder: "#E0A233",

  // Danger / Error / Denied
  danger: "#B3261E",
  dangerLight: "#FCE8E8",
  dangerBorder: "#E0453B",

  // Informational / Active
  info: "#2451C9",
  infoLight: "#E6EDFD",
  infoBorder: "#4D7BEA",

  // Optional insight / analytical accent
  insight: "#6D2FC4",
  insightLight: "#F2EAFD",
  insightBorder: "#9D5FE0",

  // Neutral states
  neutral: "#5A6472",
  neutralLight: "#EEF0F4",
  neutralBorder: "#9AA4B2",
};


/**
 * ============================================================
 * TRAINER APP STATUS SEMANTICS
 * ============================================================
 *
 * These are VISUAL mappings for existing Trainer states.
 *
 * Do not create new application states from this object.
 * Do not change existing state logic.
 */

export const STATUS_SEMANTICS = {
  confirmed: {
    label: "Confirmed",
    icon: "✓",
    color: COLOR.success,
    bg: COLOR.successLight,
    border: COLOR.successBorder,
    desc: "Existing session confirmed state",
  },

  pending: {
    label: "Pending",
    icon: "!",
    color: COLOR.warning,
    bg: COLOR.warningLight,
    border: COLOR.warningBorder,
    desc: "Existing pending state",
  },

  active: {
    label: "Active",
    icon: "•",
    color: COLOR.info,
    bg: COLOR.infoLight,
    border: COLOR.infoBorder,
    desc: "Existing active or in-progress state",
  },

  completed: {
    label: "Completed",
    icon: "✓",
    color: COLOR.success,
    bg: COLOR.successLight,
    border: COLOR.successBorder,
    desc: "Existing completed state",
  },

  denied: {
    label: "Denied",
    icon: "×",
    color: COLOR.danger,
    bg: COLOR.dangerLight,
    border: COLOR.dangerBorder,
    desc: "Existing denied state",
  },

  error: {
    label: "Error",
    icon: "!",
    color: COLOR.danger,
    bg: COLOR.dangerLight,
    border: COLOR.dangerBorder,
    desc: "Existing error state",
  },

  info: {
    label: "Information",
    icon: "i",
    color: COLOR.info,
    bg: COLOR.infoLight,
    border: COLOR.infoBorder,
    desc: "Existing informational state",
  },

  neutral: {
    label: "Unavailable",
    icon: "○",
    color: COLOR.neutral,
    bg: COLOR.neutralLight,
    border: COLOR.neutralBorder,
    desc: "Existing neutral or unavailable state",
  },

  insight: {
    label: "Insight",
    icon: "✦",
    color: COLOR.insight,
    bg: COLOR.insightLight,
    border: COLOR.insightBorder,
    desc: "Use only where the existing Trainer App already has insight/analytics content",
  },
};


/**
 * ============================================================
 * TRAINER SHIFT / SCHEDULE VISUAL BADGES
 * ============================================================
 *
 * Only use these if the Trainer App already has equivalent
 * shift states.
 */

export const SHIFT_BADGES = {
  day: {
    code: "D",
    label: "Day",
    bg: COLOR.brandNavy,
    text: COLOR.white,
    border: COLOR.brandNavy,
  },

  night: {
    code: "N",
    label: "Night",
    bg: COLOR.brandIris,
    text: COLOR.white,
    border: COLOR.brandIris,
  },

  off: {
    code: "O",
    label: "Off",
    bg: COLOR.neutralLight,
    text: COLOR.neutral,
    border: COLOR.neutralBorder,
  },

  absent: {
    code: "A",
    label: "Absent",
    bg: COLOR.dangerLight,
    text: COLOR.danger,
    border: COLOR.dangerBorder,
  },
};


/**
 * ============================================================
 * RADIUS SYSTEM
 * ============================================================
 */

export const RADIUS = {
  xs: 6,
  sm: 8,
  comp: 10,
  md: 12,

  card: 16,
  lgCard: 18,
  lg: 20,

  modal: 24,

  pill: 9999,
};


/**
 * ============================================================
 * SHADOW SYSTEM
 * ============================================================
 */

export const SHADOW = {
  none: "none",

  subtle:
    "0 1px 2px rgba(15, 23, 42, 0.04)",

  card:
    "0 1px 2px rgba(15, 23, 42, 0.04)",

  cardHover:
    "0 2px 6px rgba(15, 23, 42, 0.06)",

  floating:
    "0 6px 16px -4px rgba(15, 23, 42, 0.10)",

  sheet:
    "0 -4px 16px rgba(15, 23, 42, 0.08)",

  modal:
    "0 12px 32px rgba(15, 23, 42, 0.14)",

  // Flat theme: buttons carry no glow
  brandButton: "none",
};


/**
 * ============================================================
 * TYPOGRAPHY SYSTEM
 * ============================================================
 */

export const TYPE = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",

  display: {
    fontSize: 26,
    lineHeight: "32px",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },

  pageTitle: {
    fontSize: 20,
    lineHeight: "26px",
    fontWeight: 700,
    letterSpacing: "-0.015em",
  },

  section: {
    fontSize: 16,
    lineHeight: "22px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },

  cardTitle: {
    fontSize: 14,
    lineHeight: "20px",
    fontWeight: 600,
  },

  body: {
    fontSize: 13,
    lineHeight: "19px",
    fontWeight: 400,
  },

  bodyMedium: {
    fontSize: 13,
    lineHeight: "19px",
    fontWeight: 500,
  },

  metadata: {
    fontSize: 12,
    lineHeight: "16px",
    fontWeight: 500,
  },

  caption: {
    fontSize: 11,
    lineHeight: "15px",
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
};


/**
 * ============================================================
 * SPACING SYSTEM
 * ============================================================
 */

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};


/**
 * ============================================================
 * MOTION SYSTEM
 * ============================================================
 */

export const MOTION = {
  buttonPress: "120ms",
  cardTransition: "200ms",
  bottomSheet: "260ms",
  pageTransition: "240ms",
  successConfirm: "300ms",
};


/**
 * ============================================================
 * COMPONENT-LEVEL VISUAL RULES
 * ============================================================
 */

export const COMPONENT_THEME = {
  card: {
    background: COLOR.cardBg,
    border: COLOR.border,
    borderWidth: 1,
    radius: RADIUS.card,
    shadow: SHADOW.card,
  },

  // Punch Out uses the muted ShiftEaze red, never bright #DC2626
  dangerButton: {
    background: COLOR.danger,
    color: COLOR.textWhite,
    radius: RADIUS.pill,
    shadow: SHADOW.none,
  },

  primaryButton: {
    background: COLOR.primary,
    color: COLOR.textWhite,
    radius: RADIUS.md,
    shadow: SHADOW.brandButton,
  },

  secondaryButton: {
    background: COLOR.white,
    color: COLOR.textPrimary,
    border: COLOR.borderStrong,
    borderWidth: 1,
    radius: RADIUS.md,
  },

  input: {
    background: COLOR.white,
    color: COLOR.textPrimary,
    placeholder: COLOR.textMuted,
    border: COLOR.borderStrong,
    borderWidth: 1,
    radius: RADIUS.comp,
    focusBorder: COLOR.primary,
    focusBackground: COLOR.white,
  },

  page: {
    background: COLOR.appBg,
  },

  navigation: {
    background: "rgba(255, 255, 255, 0.96)",
    borderTop: COLOR.border,
    active: COLOR.primary,
    inactive: COLOR.textMuted,
  },

  modal: {
    background: COLOR.white,
    radius: RADIUS.modal,
    shadow: SHADOW.modal,
  },
};