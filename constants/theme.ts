import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#eeeeee",
    textSecondary: "#aaaaaa",
    textTertiary: "#888888",
    buttonText: "#000000",
    tabIconDefault: "#888888",
    tabIconSelected: "#00ff00",
    link: "#00ff00",
    backgroundRoot: "#1a1a2e",
    backgroundDefault: "#16213e",
    backgroundSecondary: "#0f3460",
    backgroundTertiary: "#1f4068",
    accent: "#00ff00",
    accentRed: "#e94560",
    accentOrange: "#ff9800",
    accentYellow: "#ffd700",
    accentBlue: "#3498db",
    methodGet: "#27ae60",
    methodPost: "#e94560",
    methodPut: "#f39c12",
    methodDelete: "#c0392b",
    methodPatch: "#9b59b6",
  },
  dark: {
    text: "#eeeeee",
    textSecondary: "#aaaaaa",
    textTertiary: "#888888",
    buttonText: "#000000",
    tabIconDefault: "#888888",
    tabIconSelected: "#00ff00",
    link: "#00ff00",
    backgroundRoot: "#1a1a2e",
    backgroundDefault: "#16213e",
    backgroundSecondary: "#0f3460",
    backgroundTertiary: "#1f4068",
    accent: "#00ff00",
    accentRed: "#e94560",
    accentOrange: "#ff9800",
    accentYellow: "#ffd700",
    accentBlue: "#3498db",
    methodGet: "#27ae60",
    methodPost: "#e94560",
    methodPut: "#f39c12",
    methodDelete: "#c0392b",
    methodPatch: "#9b59b6",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  mono: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
