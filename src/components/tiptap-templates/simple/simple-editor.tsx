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
import { openFile, saveFile, saveFileAs, openFileByPath } from "@/lib/file-ops"
import { setupNativeMenu, type MenuHandlers } from "@/lib/native-menu"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { listen } from "@tauri-apps/api/event"
import { ask, open } from "@tauri-apps/plugin-dialog"

// --- Markdown ---
import { Markdown } from "tiptap-markdown"

// --- AI / Edit Mode ---
import { EditorContextMenu } from "@/components/EditorContextMenu"
import { EditInstructionPopup } from "@/components/EditInstructionPopup"
import { sendAIEdit, startAISidecar, stopAISidecar, clearAIContext, onSessionReady } from "@/lib/ai"
import { AIStatusBar } from "@/components/AIStatusBar"
import { AIHighlight, addAIHighlight, clearAIHighlights } from "@/components/tiptap-extension/ai-highlight-extension"

// --- Sidebar ---
import { Sidebar } from "@/components/Sidebar"
import { PanelLeft as PanelLeftIcon } from "lucide-react"
import { WelcomeScreen } from "@/components/WelcomeScreen"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  onToggleSidebar,
  isMobile,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  onToggleSidebar: () => void
  isMobile: boolean
}) => {
  return (
    <>
      <ToolbarGroup>
        <Button variant="ghost" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <PanelLeftIcon className="tiptap-button-icon" />
        </Button>
      </ToolbarGroup>

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
  const { content, setContent, setSavedContent, currentFilePath, setCurrentFilePath, isDirty, setDirty, setShowSettings, fontSize, lineHeight, lineWidth, paragraphSpacing, paragraphIndent, autoSave, requestedFilePath, setRequestedFilePath, sidebarOpen, setSidebarOpen, setWorkspacePath, isAIProcessing, setAIProcessing, setAIError, setAIEditStatus, setAIEditNewStrings, appendAIEditNewString, setAISessionState } = useStore()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const toolbarRef = useRef<HTMLDivElement>(null)

  const fileLoadingRef = useRef(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const [contextMenuHasSelection, setContextMenuHasSelection] = useState(false)
  const [showEditInput, setShowEditInput] = useState(false)
  const [editInputPos, setEditInputPos] = useState({ top: 0, left: 0 })
  const [editHasSelection, setEditHasSelection] = useState(false)
  const [editSelectionRange, setEditSelectionRange] = useState<{ from: number; to: number } | null>(null)

  const hasDocument = currentFilePath !== null || content !== ""

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
      AIHighlight,
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

  const handleContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault()
    if (!editor) return
    const { from, to } = editor.state.selection
    const hasSelection = from !== to
    setContextMenuHasSelection(hasSelection)
    setContextMenuPos({ x: event.clientX, y: event.clientY })
    setShowContextMenu(true)
  }, [editor])

  const handleEditRequest = useCallback(() => {
    if (!editor) return
    setShowContextMenu(false)
    const { from, to } = editor.state.selection
    const hasSelection = from !== to
    setEditHasSelection(hasSelection)
    if (hasSelection) {
      setEditSelectionRange({ from, to })
      const coords = editor.view.coordsAtPos(from)
      setEditInputPos({ top: coords.top - 60, left: coords.left })
    } else {
      setEditSelectionRange(null)
      // Center the popup
      setEditInputPos({ top: window.innerHeight / 3, left: window.innerWidth / 2 - 160 })
    }
    setShowEditInput(true)
  }, [editor])

  const handleEditSubmit = useCallback(async (instruction: string) => {
    if (!editor) return

    // Close popup immediately
    setShowEditInput(false)
    setAIProcessing(true)
    setAIError(null)
    setAIEditStatus("Starting...")
    setAIEditNewStrings([])

    try {
      // Get full markdown
      const markdown = (editor.storage as any).markdown.getMarkdown()

      // Extract selected text and calculate line numbers from the markdown
      let selectionLineStart: number | null = null
      let selectionLineEnd: number | null = null
      let selectedText: string | null = null

      if (editSelectionRange) {
        const { from, to } = editSelectionRange
        // Get the selected text from ProseMirror
        const prosemirrorSelected = editor.state.doc.textBetween(from, to, "\n")

        // Find the selected text in the exported markdown to get correct line numbers
        const matchIndex = markdown.indexOf(prosemirrorSelected)
        if (matchIndex !== -1) {
          const beforeMatch = markdown.substring(0, matchIndex)
          const startLine = beforeMatch.split("\n").length
          selectionLineStart = startLine
          selectionLineEnd = startLine + prosemirrorSelected.split("\n").length - 1
          selectedText = prosemirrorSelected
        } else {
          // Fallback: send the text without line numbers
          selectedText = prosemirrorSelected
        }
      }

      const result = await sendAIEdit({
        markdownContent: markdown,
        instruction,
        selectionLineStart,
        selectionLineEnd,
        selectedText,
      })

      if (result.type === "error") {
        throw new Error(result.message || "AI edit failed")
      }

      const editedContent = result.content || markdown

      if (editedContent !== markdown) {
        const oldText = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n")

        editor.commands.setContent(editedContent)
        const serialized = (editor.storage as any).markdown.getMarkdown()
        setContent(serialized)

        const newText = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n")
        let diffStart = 0
        while (diffStart < oldText.length && diffStart < newText.length && oldText[diffStart] === newText[diffStart]) {
          diffStart++
        }
        let oldEnd = oldText.length
        let newEnd = newText.length
        while (oldEnd > diffStart && newEnd > diffStart && oldText[oldEnd - 1] === newText[newEnd - 1]) {
          oldEnd--
          newEnd--
        }

        if (newEnd > diffStart) {
          let textOffset = 0
          let pmFrom = -1
          let pmTo = -1
          editor.state.doc.descendants((node: any, pos: number) => {
            if (pmTo !== -1) return false
            if (node.isText) {
              const nodeStart = textOffset
              const nodeEnd = textOffset + node.text!.length
              if (pmFrom === -1 && nodeEnd > diffStart) {
                pmFrom = pos + (diffStart - nodeStart)
              }
              if (pmFrom !== -1 && nodeEnd >= newEnd) {
                pmTo = pos + (newEnd - nodeStart)
                return false
              }
              textOffset += node.text!.length
            } else if (node.isBlock && pos > 0) {
              textOffset += 1
              if (pmFrom === -1 && textOffset > diffStart) {
                pmFrom = pos
              }
            }
            return true
          })

          if (pmFrom !== -1 && pmTo !== -1 && pmTo > pmFrom) {
            addAIHighlight(editor, pmFrom, pmTo)
          }
        }

        setTimeout(() => {
          if (editor && !editor.isDestroyed) {
            clearAIHighlights(editor)
          }
        }, 3000)
      }

      setEditSelectionRange(null)
    } catch (err) {
      setAIError(err instanceof Error ? err.message : "AI edit failed")
    } finally {
      setAIProcessing(false)
      setAIEditStatus(null)
      setAIEditNewStrings([])
    }
  }, [editor, editSelectionRange, setAIProcessing, setAIError, setAIEditStatus, setAIEditNewStrings, setContent])

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
    clearAIContext().catch(() => {})
  }, [editor, setContent, setSavedContent, setCurrentFilePath, setDirty])

  const loadFileIntoEditor = useCallback((filePath: string, fileContent: string) => {
    if (!editor) return
    editor.commands.setContent(fileContent)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = (editor.storage as any).markdown.getMarkdown()
    setSavedContent(serialized)
    setContent(serialized)
    setCurrentFilePath(filePath)
    setDirty(false)
    clearAIContext().catch(() => {})
  }, [editor, setContent, setSavedContent, setCurrentFilePath, setDirty])

  const handleOpenFile = useCallback(async () => {
    const result = await openFile()
    if (result) {
      loadFileIntoEditor(result.path, result.content)
    }
  }, [loadFileIntoEditor])

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
    if (editor) {
      editor.commands.setContent("")
      setSavedContent("")
      setContent("")
    }
    setCurrentFilePath(null)
    setDirty(false)
    clearAIContext().catch(() => {})
  }, [editor, setContent, setSavedContent, setCurrentFilePath, setDirty])

  const handleToggleDarkMode = useCallback(() => {
    document.documentElement.classList.toggle("dark")
  }, [])

  const handleOpenFolder = useCallback(async () => {
    const selected = await open({ directory: true, recursive: true })
    if (selected) {
      setWorkspacePath(selected)
      setSidebarOpen(true)
    }
  }, [setWorkspacePath, setSidebarOpen])

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen)
  }, [sidebarOpen, setSidebarOpen])

  const menuHandlersRef = useRef<MenuHandlers>({
    onNew: handleNewFile,
    onOpen: handleOpenFile,
    onSave: handleSave,
    onSaveAs: handleSaveAs,
    onCloseFile: handleCloseFile,
    onSettings: () => setShowSettings(true),
    onToggleDarkMode: handleToggleDarkMode,
    onOpenFolder: handleOpenFolder,
    onToggleSidebar: handleToggleSidebar,
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
      onOpenFolder: handleOpenFolder,
      onToggleSidebar: handleToggleSidebar,
    }
  }, [handleNewFile, handleOpenFile, handleSave, handleSaveAs, handleCloseFile, handleToggleDarkMode, setShowSettings, setCurrentFilePath, setContent, setDirty, handleOpenFolder, handleToggleSidebar])

  useEffect(() => {
    setupNativeMenu({
      onNew: () => menuHandlersRef.current.onNew(),
      onOpen: () => menuHandlersRef.current.onOpen(),
      onSave: () => menuHandlersRef.current.onSave(),
      onSaveAs: () => menuHandlersRef.current.onSaveAs(),
      onCloseFile: () => menuHandlersRef.current.onCloseFile(),
      onSettings: () => menuHandlersRef.current.onSettings(),
      onToggleDarkMode: () => menuHandlersRef.current.onToggleDarkMode(),
      onOpenFolder: () => menuHandlersRef.current.onOpenFolder(),
      onToggleSidebar: () => menuHandlersRef.current.onToggleSidebar(),
    })
  }, [])

  // Listen for AI progress events from Rust backend
  useEffect(() => {
    const unlisten = listen<string>("ai-progress", (event) => {
      setAIEditStatus(event.payload)
    })
    return () => { unlisten.then(fn => fn()) }
  }, [setAIEditStatus])

  // Listen for AI edit applied events from Rust backend
  useEffect(() => {
    const unlisten = listen<string>("ai-edit-applied", (event) => {
      appendAIEditNewString(event.payload)
    })
    return () => { unlisten.then(fn => fn()) }
  }, [appendAIEditNewString])

  // Start/stop AI sidecar with component lifecycle
  useEffect(() => {
    startAISidecar().catch(err => console.error("Failed to start AI sidecar:", err))
    return () => { stopAISidecar().catch(() => {}) }
  }, [])

  // Listen for AI session ready event
  useEffect(() => {
    const unlistenReady = onSessionReady(() => {
      setAISessionState("ready")
    })
    return () => {
      unlistenReady.then(fn => fn())
    }
  }, [setAISessionState])

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
    if (!requestedFilePath || !editor || fileLoadingRef.current) return
    const pathToOpen = requestedFilePath
    setRequestedFilePath(null)
    fileLoadingRef.current = true
    const loadFile = async () => {
      try {
        if (isDirty) {
          const confirmed = await ask("You have unsaved changes. Discard them?", {
            title: "Unsaved Changes",
            kind: "warning",
          })
          if (!confirmed) return
        }
        const result = await openFileByPath(pathToOpen)
        loadFileIntoEditor(result.path, result.content)
      } catch (err) {
        console.error("Failed to open file:", err)
      } finally {
        fileLoadingRef.current = false
      }
    }
    loadFile()
  }, [requestedFilePath, editor, isDirty, setRequestedFilePath, loadFileIntoEditor])

  useEffect(() => {
    if (!editor) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key === "k") {
        event.preventDefault()
        handleEditRequest()
      }
    }
    const dom = editor.view.dom
    dom.addEventListener("keydown", handleKeyDown)
    return () => dom.removeEventListener("keydown", handleKeyDown)
  }, [editor, handleEditRequest])

  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom
    dom.addEventListener("contextmenu", handleContextMenu)
    return () => dom.removeEventListener("contextmenu", handleContextMenu)
  }, [editor, handleContextMenu])

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

  if (!hasDocument) {
    return (
      <div className="simple-editor-wrapper">
        <WelcomeScreen
          onNewFile={handleNewFile}
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
        />
      </div>
    )
  }

  return (
    <div className="simple-editor-wrapper">
      <Sidebar />
      <div className="simple-editor-main">
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
                onToggleSidebar={handleToggleSidebar}
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

        {showContextMenu && (
          <EditorContextMenu
            position={contextMenuPos}
            hasSelection={contextMenuHasSelection}
            onEdit={handleEditRequest}
            onClose={() => setShowContextMenu(false)}
          />
        )}

        {showEditInput && (
          <EditInstructionPopup
            position={editInputPos}
            hasSelection={editHasSelection}
            onSubmit={handleEditSubmit}
            onClose={() => {
              setShowEditInput(false)
              setEditSelectionRange(null)
            }}
          />
        )}

        {isAIProcessing && <AIStatusBar />}
      </div>
    </div>
  )
}
