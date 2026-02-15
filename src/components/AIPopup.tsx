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
      className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-80"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="e.g., make this more concise..."
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isAIProcessing}
        />
        <button
          onClick={handleSubmit}
          disabled={isAIProcessing || !instruction.trim()}
          className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAIProcessing ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {aiError && (
        <p className="mt-2 text-xs text-red-500">{aiError}</p>
      )}
    </div>
  );
}
