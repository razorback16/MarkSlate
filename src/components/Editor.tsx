import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { useStore } from "../lib/store";
import { AIPopup } from "./AIPopup";

export function Editor() {
  const { content, setContent } = useStore();
  const [showAIPopup, setShowAIPopup] = useState(false);
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing..." }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[calc(100vh-8rem)] p-8",
      },
    },
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setContent((editor.storage as any).markdown.getMarkdown());
    },
  });

  const openAIPopup = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return; // No selection

    const coords = editor.view.coordsAtPos(from);
    setSelectionRange({ from, to });
    setPopupPosition({
      top: coords.top - 60,
      left: coords.left,
    });
    setShowAIPopup(true);
  }, [editor]);

  // Register Cmd+K shortcut
  if (editor && !editor.isDestroyed) {
    // Use prosemirror keymap
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        openAIPopup();
      }
    };

    // We'll attach this via the editorRef div
    if (editorRef.current) {
      editorRef.current.onkeydown = handleKeyDown;
    }
  }

  const handleAIComplete = useCallback(
    (modifiedText: string) => {
      if (!editor || !selectionRange) return;
      const { from, to } = selectionRange;
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent(modifiedText)
        .run();
      setShowAIPopup(false);
      setSelectionRange(null);
    },
    [editor, selectionRange]
  );

  const getSelectedText = useCallback(() => {
    if (!editor || !selectionRange) return "";
    const { from, to } = selectionRange;
    return editor.state.doc.textBetween(from, to, "\n");
  }, [editor, selectionRange]);

  const getFullContext = useCallback(() => {
    if (!editor) return "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (editor.storage as any).markdown.getMarkdown();
  }, [editor]);

  return (
    <div ref={editorRef} className="flex-1 overflow-auto bg-white">
      <EditorContent editor={editor} />
      {showAIPopup && selectionRange && (
        <AIPopup
          position={popupPosition}
          selectedText={getSelectedText()}
          fullContext={getFullContext()}
          onComplete={handleAIComplete}
          onClose={() => {
            setShowAIPopup(false);
            setSelectionRange(null);
          }}
        />
      )}
    </div>
  );
}
