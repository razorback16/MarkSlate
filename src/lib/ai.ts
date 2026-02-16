import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface SidecarResponse {
  type: "result" | "error";
  content?: string;
  sessionId?: string;
  isError?: boolean;
  message?: string;
}

export async function startAISidecar(): Promise<void> {
  await invoke("start_ai_sidecar");
}

export async function sendAIEdit({
  markdownContent,
  instruction,
  selectedText,
  selectionLineStart,
  selectionLineEnd,
}: {
  markdownContent: string;
  instruction: string;
  selectedText?: string | null;
  selectionLineStart?: number | null;
  selectionLineEnd?: number | null;
}): Promise<SidecarResponse> {
  await invoke("send_ai_edit", {
    markdownContent,
    instruction,
    selectedText: selectedText ?? null,
    selectionLineStart: selectionLineStart ?? null,
    selectionLineEnd: selectionLineEnd ?? null,
  });

  return new Promise<SidecarResponse>((resolve, reject) => {
    let unlisten: (() => void) | null = null;
    const timeout = setTimeout(() => {
      if (unlisten) unlisten();
      cancelAIEdit().catch(() => {});
      reject(new Error("AI edit timed out after 60 seconds"));
    }, 60000);

    listen<string>("ai-sidecar-response", (event) => {
      clearTimeout(timeout);
      if (unlisten) unlisten();
      try {
        const response: SidecarResponse = JSON.parse(event.payload);
        resolve(response);
      } catch {
        resolve({ type: "result", content: event.payload });
      }
    }).then((fn) => {
      unlisten = fn;
    });
  });
}

export async function cancelAIEdit(): Promise<void> {
  await invoke("cancel_ai_edit");
}

export async function stopAISidecar(): Promise<void> {
  await invoke("stop_ai_sidecar");
}

export async function clearAIContext(): Promise<void> {
  await invoke("clear_ai_context");
}

export function onSessionReady(cb: () => void): Promise<() => void> {
  return listen<string>("ai-session-ready", () => {
    cb();
  });
}

export function onContextCleared(cb: () => void): Promise<() => void> {
  return listen<string>("ai-context-cleared", () => {
    cb();
  });
}
