import { invoke } from "@tauri-apps/api/core";

export async function modifyTextWithAI({
  selectedText,
  instruction,
  fullContext,
  claudePath,
}: {
  selectedText: string;
  instruction: string;
  fullContext: string;
  claudePath?: string | null;
}): Promise<string> {
  return await invoke<string>("modify_text_with_ai", {
    selectedText,
    instruction,
    fullContext,
    claudePath: claudePath || null,
  });
}

export async function detectClaudePath(): Promise<string> {
  return await invoke<string>("detect_claude_path");
}

export async function validateClaudePath(path: string): Promise<boolean> {
  return await invoke<boolean>("validate_claude_path", { path });
}
