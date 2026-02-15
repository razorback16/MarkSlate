import { useCallback, useEffect, useRef, useState } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { useWindowSize } from "@/hooks/use-window-size"
import { useCursorVisibility } from "@/hooks/use-cursor-visibility"

// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"
import { useStore } from "@/lib/store"
import { openFile, saveFile, saveFileAs } from "@/lib/file-ops"
import { setupNativeMenu, type MenuHandlers } from "@/lib/native-menu"
import { getCurrentWindow } from "@tauri-apps/api/window"

// --- Markdown ---
import { Markdown } from "tiptap-markdown"

// --- AI Popup ---
import { AIPopup } from "@/components/AIPopup"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup>
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

export function SimpleEditor() {
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const { content, setContent, setSavedContent, currentFilePath, setCurrentFilePath, isDirty, setDirty, setShowSettings, fontSize, lineHeight, lineWidth, paragraphSpacing, paragraphIndent, autoSave } = useStore()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const toolbarRef = useRef<HTMLDivElement>(null)

  const [showAIPopup, setShowAIPopup] = useState(false)
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setContent((editor.storage as any).markdown.getMarkdown());
    },
  })

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  const openAIPopup = useCallback(() => {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) return
    const coords = editor.view.coordsAtPos(from)
    setSelectionRange({ from, to })
    setPopupPosition({ top: coords.top - 60, left: coords.left })
    setShowAIPopup(true)
  }, [editor])

  const handleAIComplete = useCallback(
    (modifiedText: string) => {
      if (!editor || !selectionRange) return
      const { from, to } = selectionRange
      editor.chain().focus().setTextSelection({ from, to }).deleteSelection().insertContent(modifiedText).run()
      setShowAIPopup(false)
      setSelectionRange(null)
    },
    [editor, selectionRange]
  )

  const getSelectedText = useCallback(() => {
    if (!editor || !selectionRange) return ""
    const { from, to } = selectionRange
    return editor.state.doc.textBetween(from, to, "\n")
  }, [editor, selectionRange])

  const getFullContext = useCallback(() => {
    if (!editor) return ""
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (editor.storage as any).markdown.getMarkdown()
  }, [editor])

  const handleNewFile = useCallback(() => {
    const newContent = "# New Document\n\nStart typing..."
    if (editor) {
      editor.commands.setContent(newContent)
      const serialized = (editor.storage as any).markdown.getMarkdown()
      setSavedContent(serialized)
      setContent(serialized)
    }
    setCurrentFilePath(null)
    setDirty(false)
  }, [editor, setContent, setSavedContent, setCurrentFilePath, setDirty])

  const handleOpenFile = useCallback(async () => {
    const result = await openFile()
    if (result && editor) {
      editor.commands.setContent(result.content)
      // Use Tiptap-serialized markdown as the baseline so comparisons are consistent
      const serialized = (editor.storage as any).markdown.getMarkdown()
      setSavedContent(serialized)
      setContent(serialized)
      setCurrentFilePath(result.path)
      setDirty(false)
    }
  }, [editor, setContent, setSavedContent, setCurrentFilePath, setDirty])

  const handleSave = useCallback(async () => {
    const markdown = editor ? (editor.storage as any).markdown.getMarkdown() : content
    if (currentFilePath) {
      await saveFile(currentFilePath, markdown)
      setSavedContent(markdown)
      setDirty(false)
    } else {
      const path = await saveFileAs(markdown)
      if (path) {
        setSavedContent(markdown)
        setCurrentFilePath(path)
        setDirty(false)
      }
    }
  }, [editor, content, currentFilePath, setSavedContent, setCurrentFilePath, setDirty])

  const handleSaveAs = useCallback(async () => {
    const markdown = editor ? (editor.storage as any).markdown.getMarkdown() : content
    const path = await saveFileAs(markdown)
    if (path) {
      setSavedContent(markdown)
      setCurrentFilePath(path)
      setDirty(false)
    }
  }, [editor, content, setSavedContent, setCurrentFilePath, setDirty])

  const handleCloseFile = useCallback(() => {
    const welcomeContent = "# Welcome\n\nStart typing your markdown here..."
    if (editor) {
      editor.commands.setContent(welcomeContent)
      const serialized = (editor.storage as any).markdown.getMarkdown()
      setSavedContent(serialized)
      setContent(serialized)
    }
    setCurrentFilePath(null)
    setDirty(false)
  }, [editor, setContent, setSavedContent, setCurrentFilePath, setDirty])

  const handleToggleDarkMode = useCallback(() => {
    document.documentElement.classList.toggle("dark")
  }, [])

  const menuHandlersRef = useRef<MenuHandlers>({
    onNew: handleNewFile,
    onOpen: handleOpenFile,
    onSave: handleSave,
    onSaveAs: handleSaveAs,
    onCloseFile: handleCloseFile,
    onSettings: () => setShowSettings(true),
    onToggleDarkMode: handleToggleDarkMode,
  })

  useEffect(() => {
    menuHandlersRef.current = {
      onNew: handleNewFile,
      onOpen: handleOpenFile,
      onSave: handleSave,
      onSaveAs: handleSaveAs,
      onCloseFile: handleCloseFile,
      onSettings: () => setShowSettings(true),
      onToggleDarkMode: handleToggleDarkMode,
    }
  }, [handleNewFile, handleOpenFile, handleSave, handleSaveAs, handleCloseFile, handleToggleDarkMode, setShowSettings, setCurrentFilePath, setContent, setDirty])

  useEffect(() => {
    setupNativeMenu({
      onNew: () => menuHandlersRef.current.onNew(),
      onOpen: () => menuHandlersRef.current.onOpen(),
      onSave: () => menuHandlersRef.current.onSave(),
      onSaveAs: () => menuHandlersRef.current.onSaveAs(),
      onCloseFile: () => menuHandlersRef.current.onCloseFile(),
      onSettings: () => menuHandlersRef.current.onSettings(),
      onToggleDarkMode: () => menuHandlersRef.current.onToggleDarkMode(),
    })
  }, [])

  // Update window title based on file state
  useEffect(() => {
    const filename = currentFilePath ? currentFilePath.split("/").pop() : "Untitled"
    const prefix = isDirty ? "* " : ""
    const title = `${prefix}${filename} - MarkSlate`
    document.title = title
    getCurrentWindow().setTitle(title)
  }, [currentFilePath, isDirty])

  // Auto-save: debounce 1s after changes when enabled and file has a path
  useEffect(() => {
    if (!autoSave || !isDirty || !currentFilePath || !editor) return
    const timer = setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdown = (editor.storage as any).markdown.getMarkdown()
      await saveFile(currentFilePath, markdown)
      setSavedContent(markdown)
      setDirty(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [autoSave, isDirty, currentFilePath, editor, setSavedContent, setDirty])

  useEffect(() => {
    if (!editor) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key === "k") {
        event.preventDefault()
        openAIPopup()
      }
    }
    const dom = editor.view.dom
    dom.addEventListener("keydown", handleKeyDown)
    return () => dom.removeEventListener("keydown", handleKeyDown)
  }, [editor, openAIPopup])

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--ms-font-size", `${fontSize}pt`)
    root.style.setProperty("--ms-line-height", `${lineHeight}em`)
    root.style.setProperty("--ms-line-width", `${lineWidth}em`)
    root.style.setProperty("--ms-paragraph-spacing", `${paragraphSpacing}em`)
    root.style.setProperty("--ms-paragraph-indent", `${paragraphIndent}em`)
  }, [fontSize, lineHeight, lineWidth, paragraphSpacing, paragraphIndent])

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        >
          {mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>

      {showAIPopup && selectionRange && (
        <AIPopup
          position={popupPosition}
          selectedText={getSelectedText()}
          fullContext={getFullContext()}
          onComplete={handleAIComplete}
          onClose={() => {
            setShowAIPopup(false)
            setSelectionRange(null)
          }}
        />
      )}
    </div>
  )
}
