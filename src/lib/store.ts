import { create } from "zustand";

interface EditorStore {
  content: string;
  setContent: (content: string) => void;
  isAIProcessing: boolean;
  setAIProcessing: (processing: boolean) => void;
  aiError: string | null;
  setAIError: (error: string | null) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

export const useStore = create<EditorStore>((set) => ({
  content: "# Welcome\n\nStart typing your markdown here...",
  setContent: (content) => set({ content }),
  isAIProcessing: false,
  setAIProcessing: (isAIProcessing) => set({ isAIProcessing }),
  aiError: null,
  setAIError: (aiError) => set({ aiError }),
  apiKey: localStorage.getItem("ai-md-editor-api-key") || "",
  setApiKey: (apiKey) => {
    localStorage.setItem("ai-md-editor-api-key", apiKey);
    set({ apiKey });
  },
  showSettings: false,
  setShowSettings: (showSettings) => set({ showSettings }),
}));
