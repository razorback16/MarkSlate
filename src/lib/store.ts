import { create } from "zustand";

const EDITOR_DEFAULTS = {
  fontSize: 12,
  lineHeight: 1.6,
  lineWidth: 64,
  paragraphSpacing: 0,
  paragraphIndent: 0,
  autoSave: false,
  sidebarOpen: false,
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
  aiSidecarReady: boolean;
  setAISidecarReady: (ready: boolean) => void;
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
  workspacePath: string | null;
  setWorkspacePath: (path: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  requestedFilePath: string | null;
  setRequestedFilePath: (path: string | null) => void;
  aiSessionState: "idle" | "ready" | "editing" | "error";
  setAISessionState: (state: "idle" | "ready" | "editing" | "error") => void;
  aiEditStatus: string | null;
  setAIEditStatus: (status: string | null) => void;
  aiEditNewStrings: string[];
  setAIEditNewStrings: (strings: string[]) => void;
  appendAIEditNewString: (s: string) => void;
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
      sidebarOpen: s.sidebarOpen,
      ...patch,
    });
  };

  return {
    content: "",
    savedContent: "",
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
    aiSidecarReady: false,
    setAISidecarReady: (aiSidecarReady) => set({ aiSidecarReady }),
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
    workspacePath: null,
    setWorkspacePath: (workspacePath) => {
      set({ workspacePath });
      if (workspacePath) {
        localStorage.setItem("markslate-workspace-path", workspacePath);
      } else {
        localStorage.removeItem("markslate-workspace-path");
      }
    },
    sidebarOpen: false,
    setSidebarOpen: (sidebarOpen) => {
      set({ sidebarOpen });
      persistSettings({ sidebarOpen });
    },
    requestedFilePath: null,
    setRequestedFilePath: (requestedFilePath) => set({ requestedFilePath }),
    aiSessionState: "idle",
    setAISessionState: (aiSessionState) => set({ aiSessionState }),
    aiEditStatus: null,
    setAIEditStatus: (aiEditStatus) => set({ aiEditStatus }),
    aiEditNewStrings: [],
    setAIEditNewStrings: (aiEditNewStrings) => set({ aiEditNewStrings }),
    appendAIEditNewString: (s) => set((state) => ({ aiEditNewStrings: [...state.aiEditNewStrings, s] })),
    resetEditorDefaults: () => {
      set({ ...EDITOR_DEFAULTS });
      saveEditorSettings({ ...EDITOR_DEFAULTS });
    },
  };
});
