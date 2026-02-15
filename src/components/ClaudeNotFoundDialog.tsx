import { useStore } from "../lib/store";
import { detectClaudePath } from "../lib/ai";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useState } from "react";

export function ClaudeNotFoundDialog() {
  const { setShowClaudeNotFound, setClaudePath, setShowSettings } = useStore();
  const [retrying, setRetrying] = useState(false);

  const handleSetManually = () => {
    setShowClaudeNotFound(false);
    setShowSettings(true);
  };

  const handleTryAgain = async () => {
    setRetrying(true);
    try {
      const path = await detectClaudePath();
      setClaudePath(path);
      setShowClaudeNotFound(false);
    } catch {
      setRetrying(false);
    }
  };

  const handleContinue = () => {
    setShowClaudeNotFound(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[var(--tt-gray-dark-50)] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
          {/* Warning Icon */}
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--tt-gray-dark-900)] mb-1.5">
            Claude Code Not Found
          </h2>
          <p className="text-[13px] text-gray-500 dark:text-[var(--tt-gray-dark-500)] leading-relaxed mb-1">
            MarkSlate requires the Claude Code CLI for AI&#8209;powered editing features.
          </p>
          <button
            onClick={() => openUrl("https://docs.anthropic.com/en/docs/claude-code")}
            className="text-[12px] text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 mb-5 transition-colors"
          >
            How to install Claude Code &rarr;
          </button>
        </div>

        <div className="px-6 pb-6 space-y-2">
          <button
            onClick={handleSetManually}
            className="w-full text-[13px] py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
          >
            Set Path Manually
          </button>
          <button
            onClick={handleTryAgain}
            disabled={retrying}
            className="w-full text-[13px] py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-[var(--tt-gray-dark-200)] dark:hover:bg-[var(--tt-gray-dark-300)] text-gray-700 dark:text-[var(--tt-gray-dark-700)] font-medium transition-colors disabled:opacity-50"
          >
            {retrying ? "Searching..." : "Try Again"}
          </button>
          <button
            onClick={handleContinue}
            className="w-full text-[13px] py-2 text-gray-400 hover:text-gray-600 dark:text-[var(--tt-gray-dark-400)] dark:hover:text-[var(--tt-gray-dark-600)] transition-colors"
          >
            Continue Without AI
          </button>
        </div>
      </div>
    </div>
  );
}
