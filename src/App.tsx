import "./App.css";
import { Editor } from "./components/Editor";
import { Settings } from "./components/Settings";
import { useStore } from "./lib/store";

function App() {
  const { showSettings, setShowSettings } = useStore();

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm">
        <h1 className="text-sm font-semibold text-gray-700 tracking-tight">AI Markdown Editor</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Settings"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      <main className="flex-1 overflow-auto">
        <Editor />
      </main>

      <footer className="px-6 py-2 border-t border-gray-200 bg-gray-50/80">
        <p className="text-xs text-gray-400">
          Select text + <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">⌘K</kbd> for AI assistance
        </p>
      </footer>

      {showSettings && <Settings />}
    </div>
  );
}

export default App;
