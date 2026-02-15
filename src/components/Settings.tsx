import { useState } from "react";
import { useStore } from "../lib/store";

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const formatted = value % 1 === 0
    ? value.toString()
    : value.toFixed(step < 0.1 ? 2 : step <= 0.1 ? 1 : 0);

  return (
    <div className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-3">
      <span className="text-[13px] text-gray-500 dark:text-[var(--tt-gray-dark-500)] text-right select-none">
        {label}
      </span>
      <div className="relative flex items-center h-5">
        <div className="absolute inset-x-0 h-[3px] rounded-full bg-gray-200 dark:bg-[var(--tt-gray-dark-200)]" />
        <div
          className="absolute left-0 h-[3px] rounded-full bg-blue-500"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative w-full h-5 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-shadow hover:[&::-webkit-slider-thumb]:shadow-md
            [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-500 [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-track]:bg-transparent"
        />
      </div>
      <span className="text-[13px] text-gray-400 dark:text-[var(--tt-gray-dark-400)] tabular-nums text-right select-none">
        {formatted}{unit}
      </span>
    </div>
  );
}

export function Settings() {
  const {
    apiKey, setApiKey, setShowSettings,
    fontSize, setFontSize,
    lineHeight, setLineHeight,
    lineWidth, setLineWidth,
    paragraphSpacing, setParagraphSpacing,
    paragraphIndent, setParagraphIndent,
    autoSave, setAutoSave,
    resetEditorDefaults,
  } = useStore();
  const [key, setKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    setApiKey(key);
    setShowSettings(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[var(--tt-gray-dark-50)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-[var(--tt-gray-dark-900)]">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-gray-400 hover:text-gray-600 dark:text-[var(--tt-gray-dark-400)] dark:hover:text-[var(--tt-gray-dark-700)] transition-colors p-1 -mr-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 space-y-5">
          {/* Editor Section */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[var(--tt-gray-dark-400)] mb-3">
              Editor
            </h3>
            <div className="space-y-2.5">
              <SliderRow label="Font Size" value={fontSize} min={10} max={24} step={1} unit="pt" onChange={setFontSize} />
              <SliderRow label="Line Height" value={lineHeight} min={1} max={3} step={0.1} unit="×" onChange={setLineHeight} />
              <SliderRow label="Line Width" value={lineWidth} min={20} max={120} step={1} unit="em" onChange={setLineWidth} />
              <SliderRow label="Spacing" value={paragraphSpacing} min={0} max={3} step={0.25} unit="em" onChange={setParagraphSpacing} />
              <SliderRow label="Indent" value={paragraphIndent} min={0} max={3} step={0.25} unit="em" onChange={setParagraphIndent} />
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[13px] text-gray-500 dark:text-[var(--tt-gray-dark-500)] select-none">Auto Save</span>
              <button
                role="switch"
                aria-checked={autoSave}
                onClick={() => setAutoSave(!autoSave)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoSave ? "bg-blue-500" : "bg-gray-300 dark:bg-[var(--tt-gray-dark-300)]"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${autoSave ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
              </button>
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={resetEditorDefaults}
                className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-[var(--tt-gray-dark-400)] dark:hover:text-[var(--tt-gray-dark-600)] transition-colors"
              >
                Restore Defaults
              </button>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-[var(--tt-gray-dark-200)]" />

          {/* AI Configuration Section */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[var(--tt-gray-dark-400)] mb-1">
              AI
            </h3>
            <p className="text-[12px] text-gray-400 dark:text-[var(--tt-gray-dark-400)] mb-3">
              Anthropic API key or <code className="text-[11px] bg-gray-100 dark:bg-[var(--tt-gray-dark-200)] px-1 py-0.5 rounded font-mono">ANTHROPIC_API_KEY</code> env var.
            </p>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full border border-gray-200 dark:border-[var(--tt-gray-dark-300)] dark:bg-[var(--tt-gray-dark-100)] dark:text-[var(--tt-gray-dark-900)] rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 dark:text-[var(--tt-gray-dark-400)] dark:hover:text-[var(--tt-gray-dark-700)] transition-colors"
              >
                {showKey ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 text-[13px] text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 dark:text-[var(--tt-gray-dark-500)] dark:hover:text-[var(--tt-gray-dark-700)] dark:hover:bg-[var(--tt-gray-dark-200)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-[13px] bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
