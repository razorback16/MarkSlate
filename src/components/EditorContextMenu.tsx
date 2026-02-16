import { useEffect, useRef } from "react";

interface EditorContextMenuProps {
  position: { x: number; y: number };
  hasSelection: boolean;
  onEdit: () => void;
  onClose: () => void;
}

export function EditorContextMenu({ position, hasSelection, onEdit, onClose }: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleScroll = () => onClose();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-[var(--tt-gray-dark-50)] rounded-lg shadow-xl border border-gray-200 dark:border-[var(--tt-gray-dark-200)] py-1 min-w-[160px]"
      style={{ top: position.y, left: position.x }}
    >
      <button
        onClick={onEdit}
        className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 dark:text-[var(--tt-gray-dark-800)] hover:bg-gray-100 dark:hover:bg-[var(--tt-gray-dark-100)] flex items-center gap-2 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400 dark:text-[var(--tt-gray-dark-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
        {hasSelection ? "Edit Selection" : "Edit Document"}
      </button>
    </div>
  );
}
