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
    setShowSettings,
    fontSize, setFontSize,
    lineHeight, setLineHeight,
    lineWidth, setLineWidth,
    paragraphSpacing, setParagraphSpacing,
    paragraphIndent, setParagraphIndent,
    autoSave, setAutoSave,
    resetEditorDefaults,
  } = useStore();

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
        </div>
      </div>
    </div>
  );
}
