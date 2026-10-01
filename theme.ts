// Design tokens for ODAYA. Dark-First Utility palette - bright neon green on black.
// Keys mirror the "color" block of /app/design_guidelines.json.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  // Surfaces
  surface: "#050505",
  onSurface: "#F5F5F5",
  surfaceSecondary: "#171717",
  onSurfaceSecondary: "#E5E5E5",
  surfaceTertiary: "#262626",
  onSurfaceTertiary: "#D4D4D4",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#000000",
  muted: "#8A8A8A",

  // Brand (neon green)
  brand: "#00E676",
  onBrand: "#000000",
  brandPrimary: "#00E676",
  onBrandPrimary: "#000000",
  brandSecondary: "#00B259",
  onBrandSecondary: "#000000",
  brandTertiary: "rgba(0, 230, 118, 0.12)",
  onBrandTertiary: "#00E676",

  // Status
  success: "#00E676",
  onSuccess: "#000000",
  warning: "#FFB74D",
  onWarning: "#000000",
  error: "#EF5350",
  onError: "#FFFFFF",
  info: "#4FC3F7",
  onInfo: "#000000",

  // Lines
  border: "#262626",
  borderStrong: "#404040",
  divider: "#171717",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light?: ThemeColors; dark: ThemeColors } = { dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

// Dark-only app: force dark across native surfaces.
setColorScheme?.(themes.light ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? (system as ColorScheme) : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.dark };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

// Spacing + radii from design_guidelines.json
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const colors = themes.dark;
