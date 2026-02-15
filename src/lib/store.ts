import { create } from "zustand";

const EDITOR_DEFAULTS = {
  fontSize: 12,
  lineHeight: 1.6,
  lineWidth: 64,
  paragraphSpacing: 0,
  paragraphIndent: 0,
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
  resetEditorDefaults: () => void;
}

export const useStore = create<EditorStore>((set, get) => {
  const initialSettings = loadEditorSettings();

  return {
    content: "# Welcome\n\nStart typing your markdown here...",
    setContent: (content) => set({ content, isDirty: true }),
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
      const s = get();
      saveEditorSettings({ fontSize, lineHeight: s.lineHeight, lineWidth: s.lineWidth, paragraphSpacing: s.paragraphSpacing, paragraphIndent: s.paragraphIndent });
    },
    lineHeight: initialSettings.lineHeight,
    setLineHeight: (lineHeight) => {
      set({ lineHeight });
      const s = get();
      saveEditorSettings({ fontSize: s.fontSize, lineHeight, lineWidth: s.lineWidth, paragraphSpacing: s.paragraphSpacing, paragraphIndent: s.paragraphIndent });
    },
    lineWidth: initialSettings.lineWidth,
    setLineWidth: (lineWidth) => {
      set({ lineWidth });
      const s = get();
      saveEditorSettings({ fontSize: s.fontSize, lineHeight: s.lineHeight, lineWidth, paragraphSpacing: s.paragraphSpacing, paragraphIndent: s.paragraphIndent });
    },
    paragraphSpacing: initialSettings.paragraphSpacing,
    setParagraphSpacing: (paragraphSpacing) => {
      set({ paragraphSpacing });
      const s = get();
      saveEditorSettings({ fontSize: s.fontSize, lineHeight: s.lineHeight, lineWidth: s.lineWidth, paragraphSpacing, paragraphIndent: s.paragraphIndent });
    },
    paragraphIndent: initialSettings.paragraphIndent,
    setParagraphIndent: (paragraphIndent) => {
      set({ paragraphIndent });
      const s = get();
      saveEditorSettings({ fontSize: s.fontSize, lineHeight: s.lineHeight, lineWidth: s.lineWidth, paragraphSpacing: s.paragraphSpacing, paragraphIndent });
    },
    resetEditorDefaults: () => {
      set({ ...EDITOR_DEFAULTS });
      saveEditorSettings({ ...EDITOR_DEFAULTS });
    },
  };
});
