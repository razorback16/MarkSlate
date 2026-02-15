import { useState, useRef, useEffect } from "react";
import { useStore } from "../lib/store";
import { modifyTextWithAI } from "../lib/ai";

interface AIPopupProps {
  position: { top: number; left: number };
  selectedText: string;
  fullContext: string;
  onComplete: (modifiedText: string) => void;
  onClose: () => void;
}

export function AIPopup({ position, selectedText, fullContext, onComplete, onClose }: AIPopupProps) {
  const [instruction, setInstruction] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const { isAIProcessing, setAIProcessing, aiError, setAIError, apiKey } = useStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!instruction.trim() || isAIProcessing) return;

    setAIProcessing(true);
    setAIError(null);

    try {
      const result = await modifyTextWithAI({
        selectedText,
        instruction: instruction.trim(),
        fullContext,
        apiKey: apiKey || undefined,
      });
      onComplete(result);
    } catch (err) {
      setAIError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setAIProcessing(false);
    }
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white dark:bg-[var(--tt-gray-dark-50)] rounded-xl shadow-2xl border border-gray-100 dark:border-[var(--tt-gray-dark-200)] w-80 overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[var(--tt-gray-dark-400)]">
          AI Edit
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:text-[var(--tt-gray-dark-400)] dark:hover:text-[var(--tt-gray-dark-700)] transition-colors p-0.5 -mr-0.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-3.5 pb-3.5">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="e.g., make this more concise..."
            className="w-full text-[13px] border border-gray-200 dark:border-[var(--tt-gray-dark-300)] dark:bg-[var(--tt-gray-dark-100)] dark:text-[var(--tt-gray-dark-900)] dark:placeholder-[var(--tt-gray-dark-400)] rounded-lg px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-shadow"
            disabled={isAIProcessing}
          />
          <button
            onClick={handleSubmit}
            disabled={isAIProcessing || !instruction.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-300 hover:text-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isAIProcessing ? (
              <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>

        {aiError && (
          <p className="mt-2 text-[12px] text-red-500 dark:text-red-400">{aiError}</p>
        )}
      </div>
    </div>
  );
}
