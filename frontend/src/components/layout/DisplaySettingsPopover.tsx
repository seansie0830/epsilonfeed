import React, { useState, useRef, useEffect } from "react";
import {
  Type,
  AlignJustify,
  Maximize2,
  Minimize2,
  RotateCcw,
  SlidersHorizontal,
  X,
  Check,
  MoveVertical,
  Minus,
  Plus
} from "lucide-react";
import {
  useDisplaySettings,
  FontSize,
  LineSpacing,
  ContentSpacing
} from "../../context/DisplaySettingsContext.js";

interface DisplaySettingsPopoverProps {
  /** Optional custom trigger button rendering */
  customTrigger?: (open: boolean, toggle: () => void) => React.ReactNode;
}

export const DisplaySettingsPopover: React.FC<DisplaySettingsPopoverProps> = ({ customTrigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    settings,
    setFontSize,
    setLineSpacing,
    setContentSpacing,
    stepFontSize,
    resetSettings,
    fontSizeConfig,
    lineSpacingConfig,
    contentSpacingConfig
  } = useDisplaySettings();

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const fontKeys: FontSize[] = ["sm", "md", "lg", "xl"];
  const lineKeys: LineSpacing[] = ["compact", "normal", "relaxed"];
  const spaceKeys: ContentSpacing[] = ["compact", "normal", "spacious"];

  const isDefault =
    settings.fontSize === "md" &&
    settings.lineSpacing === "normal" &&
    settings.contentSpacing === "normal";

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button */}
      {customTrigger ? (
        customTrigger(isOpen, toggleOpen)
      ) : (
        <button
          type="button"
          onClick={toggleOpen}
          title="調整字體與間距 (Display Settings)"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95 ${
            isOpen
              ? "bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-500/20"
              : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700"
          }`}
        >
          <Type className="w-4 h-4 text-brand-400" />
          <span className="hidden sm:inline font-medium">排版設定</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800/80 text-brand-300 border border-slate-700/60">
            {fontSizeConfig[settings.fontSize].label} / {lineSpacingConfig[settings.lineSpacing].label}
          </span>
        </button>
      )}

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel rounded-2xl border border-slate-800/90 shadow-2xl p-5 z-50 animate-fade-in backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-none">版面與閱讀偏好</h3>
                <p className="text-[10px] text-slate-400 mt-1">即時自訂字體大小、行距及內容間距</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. 字體大小 (Font Size) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-brand-400" />
                  <span>字體大小</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => stepFontSize(-1)}
                    disabled={settings.fontSize === "sm"}
                    title="縮小字體"
                    className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-[11px] text-brand-300 px-1.5 min-w-10 text-center">
                    {fontSizeConfig[settings.fontSize].px}
                  </span>
                  <button
                    type="button"
                    onClick={() => stepFontSize(1)}
                    disabled={settings.fontSize === "xl"}
                    title="放大字體"
                    className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {fontKeys.map((key) => {
                  const item = fontSizeConfig[key];
                  const isSelected = settings.fontSize === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFontSize(key)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-brand-600/90 text-white border-brand-500 shadow-sm"
                          : "bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800/80"
                      }`}
                    >
                      <span
                        className="font-bold mb-0.5 leading-tight"
                        style={{ fontSize: item.px }}
                      >
                        A
                      </span>
                      <span className="text-[10px] opacity-80">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. 行高 / 行距 (Line Spacing) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <MoveVertical className="w-3.5 h-3.5 text-indigo-400" />
                  <span>行距 / 行高</span>
                </label>
                <span className="font-mono text-[11px] text-indigo-300">
                  {lineSpacingConfig[settings.lineSpacing].desc}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {lineKeys.map((key) => {
                  const item = lineSpacingConfig[key];
                  const isSelected = settings.lineSpacing === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLineSpacing(key)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "bg-indigo-600/90 text-white border-indigo-500 shadow-sm font-semibold"
                          : "bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800/80"
                      }`}
                    >
                      <AlignJustify className="w-3.5 h-3.5 opacity-70" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. 內容與卡片間距 (Content & Card Spacing) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>間距與版面密度</span>
                </label>
                <span className="text-[11px] text-purple-300">
                  {contentSpacingConfig[settings.contentSpacing].desc}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {spaceKeys.map((key) => {
                  const item = contentSpacingConfig[key];
                  const isSelected = settings.contentSpacing === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setContentSpacing(key)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "bg-purple-600/90 text-white border-purple-500 shadow-sm font-semibold"
                          : "bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800/80"
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                即時預覽效果 (Preview)
              </span>
              <div
                className="text-slate-300 transition-all rounded"
                style={{
                  fontSize: fontSizeConfig[settings.fontSize].px,
                  lineHeight: lineSpacingConfig[settings.lineSpacing].value,
                  marginBottom: contentSpacingConfig[settings.contentSpacing].paragraph
                }}
              >
                這是段落預覽文字。調整字體大小與行距後，所有文章、卡片與 Markdown 內容皆會即時同步套用。
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={resetSettings}
              disabled={isDefault}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重設預設值</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
