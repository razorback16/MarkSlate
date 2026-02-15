import { useState, useEffect, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useStore } from "@/lib/store";
import {
  readDirectoryLevel,
  createGitignoreMatcher,
  type FileTreeEntry,
  type ShouldIgnoreFn,
} from "@/lib/file-tree";
import { ChevronRight, Folder, File, RefreshCw, FolderPlus, FolderOpen, Loader2 } from "lucide-react";

function FileTreeNode({
  entry,
  depth,
  currentFilePath,
  onFileClick,
  workspacePath,
  shouldIgnore,
}: {
  entry: FileTreeEntry;
  depth: number;
  currentFilePath: string | null;
  onFileClick: (path: string) => void;
  workspacePath: string;
  shouldIgnore: ShouldIgnoreFn;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileTreeEntry[] | null>(entry.children ?? null);
  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (children !== null) return; // already loaded
    setLoading(true);
    try {
      const entries = await readDirectoryLevel(workspacePath, entry.path, shouldIgnore);
      setChildren(entries);
    } catch (err) {
      console.warn(`Failed to read directory: ${entry.path}`, err);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [expanded, children, workspacePath, entry.path, shouldIgnore]);

  if (entry.isDirectory) {
    return (
      <div>
        <button
          onClick={handleToggle}
          className="flex items-center w-full text-left gap-1 py-[3px] pr-2 text-[13px] text-gray-700 dark:text-[var(--tt-gray-dark-700)] hover:bg-gray-100 dark:hover:bg-[var(--tt-gray-dark-200)] rounded-sm cursor-pointer"
          style={{ paddingLeft: depth * 16 + 8 }}
        >
          <ChevronRight
            size={16}
            className={`shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          {expanded ? (
            <FolderOpen size={16} className="shrink-0" />
          ) : (
            <Folder size={16} className="shrink-0" />
          )}
          <span className="truncate">{entry.name}</span>
        </button>
        {expanded && (
          <div>
            {loading ? (
              <div
                className="flex items-center gap-1 py-[3px] text-[12px] text-gray-400 dark:text-[var(--tt-gray-dark-400)]"
                style={{ paddingLeft: (depth + 1) * 16 + 8 }}
              >
                <Loader2 size={12} className="animate-spin" />
                <span>Loading...</span>
              </div>
            ) : children && children.length > 0 ? (
              children.map((child) => (
                <FileTreeNode
                  key={child.path}
                  entry={child}
                  depth={depth + 1}
                  currentFilePath={currentFilePath}
                  onFileClick={onFileClick}
                  workspacePath={workspacePath}
                  shouldIgnore={shouldIgnore}
                />
              ))
            ) : children && children.length === 0 ? (
              <div
                className="py-[3px] text-[12px] text-gray-400 dark:text-[var(--tt-gray-dark-400)] italic"
                style={{ paddingLeft: (depth + 1) * 16 + 8 }}
              >
                No markdown files
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  const isActive = currentFilePath === entry.path;

  return (
    <button
      onClick={() => onFileClick(entry.path)}
      className={`flex items-center w-full text-left gap-1 py-[3px] pr-2 text-[13px] rounded-sm cursor-pointer ${
        isActive
          ? "bg-[var(--tt-brand-color-50)] text-[var(--tt-brand-color-700)] dark:text-[var(--tt-brand-color-300)]"
          : "text-gray-700 dark:text-[var(--tt-gray-dark-700)] hover:bg-gray-100 dark:hover:bg-[var(--tt-gray-dark-200)]"
      }`}
      style={{ paddingLeft: depth * 16 + 24 }}
    >
      <File size={16} className="shrink-0" />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

export function Sidebar() {
  const { workspacePath, setWorkspacePath, sidebarOpen, currentFilePath, setRequestedFilePath } =
    useStore();
  const [tree, setTree] = useState<FileTreeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shouldIgnore, setShouldIgnore] = useState<ShouldIgnoreFn | null>(null);

  const loadTree = useCallback(async () => {
    if (!workspacePath) {
      setTree([]);
      setLoadError(null);
      setShouldIgnore(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const ignoreFn = await createGitignoreMatcher(workspacePath);
      setShouldIgnore(() => ignoreFn);
      const entries = await readDirectoryLevel(workspacePath, workspacePath, ignoreFn);
      setTree(entries);
    } catch (err) {
      console.error("Failed to read directory:", err);
      setTree([]);
      setLoadError(err instanceof Error ? err.message : "Unable to read this folder");
    } finally {
      setLoading(false);
    }
  }, [workspacePath]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const handleOpenFolder = useCallback(async () => {
    const selected = await open({ directory: true, recursive: true });
    if (selected) {
      setWorkspacePath(selected);
    }
  }, [setWorkspacePath]);

  const handleFileClick = useCallback(
    (path: string) => {
      if (path === currentFilePath) return;
      setRequestedFilePath(path);
    },
    [currentFilePath, setRequestedFilePath]
  );

  if (!sidebarOpen) return null;

  const folderName = workspacePath ? workspacePath.split(/[\\/]/).pop() : null;

  // Fallback ignore fn that ignores nothing (used before gitignore is loaded)
  const ignoreFn = shouldIgnore ?? (() => false);

  return (
    <div className="w-60 shrink-0 h-screen bg-[var(--tt-sidebar-bg-color)] border-r border-[var(--tt-border-color)] flex flex-col select-none overflow-hidden">
      {workspacePath ? (
        <>
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--tt-border-color)]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-[var(--tt-gray-dark-500)] truncate flex-1">
              {folderName}
            </span>
            <button
              onClick={loadTree}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[var(--tt-gray-dark-200)] text-gray-500 dark:text-[var(--tt-gray-dark-500)] cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={handleOpenFolder}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[var(--tt-gray-dark-200)] text-gray-500 dark:text-[var(--tt-gray-dark-500)] cursor-pointer"
              title="Change Folder"
            >
              <FolderPlus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {loading ? (
              <div className="px-3 py-4 text-[12px] text-gray-400 dark:text-[var(--tt-gray-dark-400)]">
                Loading...
              </div>
            ) : loadError ? (
              <div className="px-3 py-4 text-[12px] text-red-500 dark:text-red-400">
                {loadError}
              </div>
            ) : tree.length === 0 ? (
              <div className="px-3 py-4 text-[12px] text-gray-400 dark:text-[var(--tt-gray-dark-400)]">
                No markdown files found
              </div>
            ) : (
              tree.map((entry) => (
                <FileTreeNode
                  key={entry.path}
                  entry={entry}
                  depth={0}
                  currentFilePath={currentFilePath}
                  onFileClick={handleFileClick}
                  workspacePath={workspacePath}
                  shouldIgnore={ignoreFn}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
          <p className="text-[12px] text-gray-400 dark:text-[var(--tt-gray-dark-400)] text-center">
            Open a folder to browse markdown files
          </p>
          <button
            onClick={handleOpenFolder}
            className="px-3 py-1.5 text-[13px] rounded bg-[var(--tt-brand-color-500)] text-white hover:bg-[var(--tt-brand-color-600)] cursor-pointer"
          >
            Open Folder
          </button>
        </div>
      )}
    </div>
  );
}
