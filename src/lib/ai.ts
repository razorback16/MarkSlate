import { invoke } from "@tauri-apps/api/core";

export interface EditResult {
  content: string;
  session_id: string | null;
}

export async function editWithAI({
  markdownContent,
  instruction,
  selectionLineStart,
  selectionLineEnd,
  selectedText,
  claudePath,
  workspacePath,
  sessionId,
}: {
  markdownContent: string;
  instruction: string;
  selectionLineStart?: number | null;
  selectionLineEnd?: number | null;
  selectedText?: string | null;
  claudePath?: string | null;
  workspacePath?: string | null;
  sessionId?: string | null;
}): Promise<EditResult> {
  return await invoke<EditResult>("edit_with_ai", {
    markdownContent,
    instruction,
    selectionLineStart: selectionLineStart ?? null,
    selectionLineEnd: selectionLineEnd ?? null,
    selectedText: selectedText ?? null,
    claudePath: claudePath || null,
    workspacePath: workspacePath || null,
    sessionId: sessionId ?? null,
  });
}

export async function detectClaudePath(): Promise<string> {
  return await invoke<string>("detect_claude_path");
}

export async function validateClaudePath(path: string): Promise<boolean> {
  return await invoke<boolean>("validate_claude_path", { path });
}
