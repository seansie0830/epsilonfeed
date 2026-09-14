import React, { createContext, useContext, useEffect, useState } from "react";

export type FontSize = "sm" | "md" | "lg" | "xl";
export type LineSpacing = "compact" | "normal" | "relaxed";
export type ContentSpacing = "compact" | "normal" | "spacious";

export interface DisplaySettings {
  fontSize: FontSize;
  lineSpacing: LineSpacing;
  contentSpacing: ContentSpacing;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  fontSize: "md",
  lineSpacing: "normal",
  contentSpacing: "normal"
};

const FONT_SIZE_MAP: Record<FontSize, { label: string; px: string; previewScale: string }> = {
  sm: { label: "小", px: "14px", previewScale: "0.875" },
  md: { label: "標準", px: "16px", previewScale: "1" },
  lg: { label: "大", px: "18px", previewScale: "1.125" },
  xl: { label: "特大", px: "20px", previewScale: "1.25" }
};

const LINE_SPACING_MAP: Record<LineSpacing, { label: string; value: string; desc: string }> = {
  compact: { label: "緊湊", value: "1.45", desc: "1.45x" },
  normal: { label: "標準", value: "1.7", desc: "1.70x" },
  relaxed: { label: "寬鬆", value: "2.0", desc: "2.00x" }
};

const CONTENT_SPACING_MAP: Record<
  ContentSpacing,
  { label: string; paragraph: string; cardGap: string; cardPadding: string; desc: string }
> = {
  compact: {
    label: "緊湊",
    paragraph: "0.5rem",
    cardGap: "0.625rem",
    cardPadding: "0.875rem",
    desc: "高資訊密度"
  },
  normal: {
    label: "標準",
    paragraph: "0.875rem",
    cardGap: "1rem",
    cardPadding: "1.25rem",
    desc: "最適閱讀平衡"
  },
  spacious: {
    label: "寬敞",
    paragraph: "1.35rem",
    cardGap: "1.5rem",
    cardPadding: "1.625rem",
    desc: "充裕留白視覺"
  }
};

interface DisplaySettingsContextType {
  settings: DisplaySettings;
  setFontSize: (size: FontSize) => void;
  setLineSpacing: (spacing: LineSpacing) => void;
  setContentSpacing: (spacing: ContentSpacing) => void;
  stepFontSize: (delta: -1 | 1) => void;
  resetSettings: () => void;
  fontSizeConfig: typeof FONT_SIZE_MAP;
  lineSpacingConfig: typeof LINE_SPACING_MAP;
  contentSpacingConfig: typeof CONTENT_SPACING_MAP;
}

const STORAGE_KEY = "epsilon_display_settings";

const DisplaySettingsContext = createContext<DisplaySettingsContextType | undefined>(undefined);

export const DisplaySettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<DisplaySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_DISPLAY_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Failed to parse display settings:", e);
    }
    return DEFAULT_DISPLAY_SETTINGS;
  });

  // Apply CSS custom properties whenever settings change
  useEffect(() => {
    const root = document.documentElement;
    const fontInfo = FONT_SIZE_MAP[settings.fontSize] || FONT_SIZE_MAP.md;
    const lineInfo = LINE_SPACING_MAP[settings.lineSpacing] || LINE_SPACING_MAP.normal;
    const spaceInfo = CONTENT_SPACING_MAP[settings.contentSpacing] || CONTENT_SPACING_MAP.normal;

    root.style.setProperty("--reading-font-size", fontInfo.px);
    root.style.setProperty("--reading-line-height", lineInfo.value);
    root.style.setProperty("--reading-paragraph-spacing", spaceInfo.paragraph);
    root.style.setProperty("--reading-card-spacing", spaceInfo.cardGap);
    root.style.setProperty("--reading-card-padding", spaceInfo.cardPadding);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save display settings:", e);
    }
  }, [settings]);

  const setFontSize = (size: FontSize) => {
    setSettings((prev) => ({ ...prev, fontSize: size }));
  };

  const setLineSpacing = (spacing: LineSpacing) => {
    setSettings((prev) => ({ ...prev, lineSpacing: spacing }));
  };

  const setContentSpacing = (spacing: ContentSpacing) => {
    setSettings((prev) => ({ ...prev, contentSpacing: spacing }));
  };

  const stepFontSize = (delta: -1 | 1) => {
    const order: FontSize[] = ["sm", "md", "lg", "xl"];
    const currentIndex = order.indexOf(settings.fontSize);
    const nextIndex = Math.max(0, Math.min(order.length - 1, currentIndex + delta));
    setFontSize(order[nextIndex]);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_DISPLAY_SETTINGS);
  };

  return (
    <DisplaySettingsContext.Provider
      value={{
        settings,
        setFontSize,
        setLineSpacing,
        setContentSpacing,
        stepFontSize,
        resetSettings,
        fontSizeConfig: FONT_SIZE_MAP,
        lineSpacingConfig: LINE_SPACING_MAP,
        contentSpacingConfig: CONTENT_SPACING_MAP
      }}
    >
      {children}
    </DisplaySettingsContext.Provider>
  );
};

export const useDisplaySettings = () => {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    throw new Error("useDisplaySettings must be used within a DisplaySettingsProvider");
  }
  return context;
};
