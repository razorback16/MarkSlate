import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import ignore from "ignore";

export interface FileTreeEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeEntry[];
}

const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".txt"];

function isMarkdownFile(name: string): boolean {
  return MARKDOWN_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

function joinPath(basePath: string, name: string): string {
  if (basePath.endsWith("/") || basePath.endsWith("\\")) {
    return `${basePath}${name}`;
  }
  return `${basePath}/${name}`;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function getRelativePath(rootPath: string, fullPath: string): string {
  const normalizedRoot = normalizePath(rootPath).replace(/\/+$/, "");
  const normalizedFull = normalizePath(fullPath).replace(/\/+$/, "");

  if (normalizedFull === normalizedRoot) return "";
  if (normalizedFull.startsWith(`${normalizedRoot}/`)) {
    return normalizedFull.slice(normalizedRoot.length + 1);
  }
  return "";
}

export type ShouldIgnoreFn = (relativePath: string, isDirectory: boolean) => boolean;

export async function createGitignoreMatcher(rootPath: string): Promise<ShouldIgnoreFn> {
  const ig = ignore({ allowRelativePaths: true });

  try {
    const gitignorePath = joinPath(rootPath, ".gitignore");
    const gitignoreContent = await readTextFile(gitignorePath);
    ig.add(gitignoreContent);
  } catch {
    // No .gitignore in workspace root is valid; skip ignore filtering in that case.
  }

  return (relativePath: string, isDirectory: boolean): boolean => {
    if (!relativePath) return false;

    const normalized = normalizePath(relativePath).replace(/^\/+/, "");
    const candidate = isDirectory ? `${normalized}/` : normalized;

    return ig.ignores(candidate);
  };
}

/** Read a single directory level (non-recursive). Returns sorted entries with empty children arrays for directories. */
export async function readDirectoryLevel(
  rootPath: string,
  currentPath: string,
  shouldIgnore: ShouldIgnoreFn,
): Promise<FileTreeEntry[]> {
  const entries = await readDir(currentPath);
  const result: FileTreeEntry[] = [];

  for (const entry of entries) {
    const { name } = entry;
    if (isHidden(name)) continue;

    const fullPath = joinPath(currentPath, name);
    const relativePath = getRelativePath(rootPath, fullPath);

    if (shouldIgnore(relativePath, entry.isDirectory)) continue;

    if (entry.isDirectory) {
      result.push({
        name,
        path: fullPath,
        isDirectory: true,
        // children left undefined — loaded lazily on expand
      });
    } else if (!entry.isDirectory && isMarkdownFile(name)) {
      result.push({
        name,
        path: fullPath,
        isDirectory: false,
      });
    }
  }

  result.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}
