import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export async function openFile(): Promise<{ path: string; content: string } | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
  });

  if (!selected) return null;

  const content = await readTextFile(selected);
  return { path: selected, content };
}

export async function saveFile(path: string, content: string): Promise<void> {
  await writeTextFile(path, content);
}

export async function saveFileAs(content: string): Promise<string | null> {
  const path = await save({
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    defaultPath: "untitled.md",
  });

  if (!path) return null;

  await writeTextFile(path, content);
  return path;
}
