import { create } from "zustand";

const EDITOR_DEFAULTS = {
  fontSize: 12,
  lineHeight: 1.6,
  lineWidth: 64,
  paragraphSpacing: 0,
  paragraphIndent: 0,
  autoSave: false,
};

function loadEditorSettings() {
  try {
    const saved = localStorage.getItem("markslate-editor-settings");
    if (saved) return { ...EDITOR_DEFAULTS, ...JSON.parse(saved) };
  } catch {}
  return { ...EDITOR_DEFAULTS };
}

function saveEditorSettings(settings: typeof EDITOR_DEFAULTS) {
  localStorage.setItem("markslate-editor-settings", JSON.stringify(settings));
}

interface EditorStore {
  content: string;
  setContent: (content: string) => void;
  savedContent: string;
  setSavedContent: (content: string) => void;
  currentFilePath: string | null;
  setCurrentFilePath: (path: string | null) => void;
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  isAIProcessing: boolean;
  setAIProcessing: (processing: boolean) => void;
  aiError: string | null;
  setAIError: (error: string | null) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  lineHeight: number;
  setLineHeight: (height: number) => void;
  lineWidth: number;
  setLineWidth: (width: number) => void;
  paragraphSpacing: number;
  setParagraphSpacing: (spacing: number) => void;
  paragraphIndent: number;
  setParagraphIndent: (indent: number) => void;
  autoSave: boolean;
  setAutoSave: (autoSave: boolean) => void;
  resetEditorDefaults: () => void;
}

export const useStore = create<EditorStore>((set, get) => {
  const initialSettings = loadEditorSettings();

  const persistSettings = (patch: Partial<typeof EDITOR_DEFAULTS>) => {
    const s = get();
    saveEditorSettings({
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      lineWidth: s.lineWidth,
      paragraphSpacing: s.paragraphSpacing,
      paragraphIndent: s.paragraphIndent,
      autoSave: s.autoSave,
      ...patch,
    });
  };

  return {
    content: "# Welcome\n\nStart typing your markdown here...",
    savedContent: "# Welcome\n\nStart typing your markdown here...",
    setContent: (content) => set({ content, isDirty: content !== get().savedContent }),
    setSavedContent: (savedContent) => set({ savedContent }),
    currentFilePath: null,
    setCurrentFilePath: (currentFilePath) => set({ currentFilePath }),
    isDirty: false,
    setDirty: (isDirty) => set({ isDirty }),
    isAIProcessing: false,
    setAIProcessing: (isAIProcessing) => set({ isAIProcessing }),
    aiError: null,
    setAIError: (aiError) => set({ aiError }),
    apiKey: localStorage.getItem("markslate-api-key") || "",
    setApiKey: (apiKey) => {
      localStorage.setItem("markslate-api-key", apiKey);
      set({ apiKey });
    },
    showSettings: false,
    setShowSettings: (showSettings) => set({ showSettings }),
    fontSize: initialSettings.fontSize,
    setFontSize: (fontSize) => {
      set({ fontSize });
      persistSettings({ fontSize });
    },
    lineHeight: initialSettings.lineHeight,
    setLineHeight: (lineHeight) => {
      set({ lineHeight });
      persistSettings({ lineHeight });
    },
    lineWidth: initialSettings.lineWidth,
    setLineWidth: (lineWidth) => {
      set({ lineWidth });
      persistSettings({ lineWidth });
    },
    paragraphSpacing: initialSettings.paragraphSpacing,
    setParagraphSpacing: (paragraphSpacing) => {
      set({ paragraphSpacing });
      persistSettings({ paragraphSpacing });
    },
    paragraphIndent: initialSettings.paragraphIndent,
    setParagraphIndent: (paragraphIndent) => {
      set({ paragraphIndent });
      persistSettings({ paragraphIndent });
    },
    autoSave: initialSettings.autoSave,
    setAutoSave: (autoSave) => {
      set({ autoSave });
      persistSettings({ autoSave });
    },
    resetEditorDefaults: () => {
      set({ ...EDITOR_DEFAULTS });
      saveEditorSettings({ ...EDITOR_DEFAULTS });
    },
  };
});
