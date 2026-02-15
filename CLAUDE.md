# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
bun install                # Install dependencies
bun run tauri dev          # Dev mode: Vite (port 1420) + Tauri with hot reload
bun run tauri build        # Production build: TypeScript → Vite bundle → Tauri binary
bun run build              # Frontend-only build (tsc + vite build)
```

**Prerequisites:** Bun (or Node 18+), Rust toolchain, Tauri CLI v2. No test suite exists yet.

## Architecture

**MarkSlate** is a distraction-free markdown editor: Tauri 2 desktop app with React 19 frontend and Rust backend.

### Frontend (`src/`)
- **React 19 + TypeScript** with **Vite 7** bundler
- **TipTap 3** (ProseMirror wrapper) for rich text editing with markdown import/export via `tiptap-markdown`
- **Zustand** for state management (`src/lib/store.ts`) — editor content, file path, dirty state, AI state, settings
- **Tailwind CSS 4** + custom SCSS for theming and dark mode
- Settings persist to `localStorage` under key `markslate-editor-settings`
- Path alias: `@/*` maps to `./src/*`

### Backend (`src-tauri/`)
- **Rust** with minimal surface: 3 Tauri commands in `src-tauri/src/lib.rs`
  - `detect_claude_path()` — searches common install dirs + `which claude`
  - `validate_claude_path()` — checks file exists and is executable
  - `modify_text_with_ai()` — spawns `claude -p` subprocess with document context
- Tauri plugins: `fs`, `dialog`, `opener` (no `menu` plugin — menu is set up programmatically)

### Frontend → Backend Communication
React calls `@tauri-apps/api/core.invoke()` via wrapper functions in `src/lib/ai.ts`. Tauri commands return `Result<T, String>`.

### AI Integration
Claude CLI is invoked as a subprocess (`claude -p --model claude-sonnet-4-5-20250929`). The full document context + selected text + user instruction are sent via stdin. The response replaces the selection in the editor. No API keys needed — uses existing Claude Code authentication.

### Key Files
- `src/components/tiptap-templates/simple/simple-editor.tsx` — Main editor component (~400 lines)
- `src/lib/store.ts` — Zustand store (content, file state, AI state, settings)
- `src/lib/file-ops.ts` — Native file open/save via Tauri dialog + fs plugins
- `src/lib/native-menu.ts` — Native app menu setup (File, Edit, app menus)
- `src/lib/ai.ts` — Tauri command wrappers for AI features
- `src/lib/tiptap-utils.ts` — Editor utilities, image upload handling (5MB max)
- `src/components/AIPopup.tsx` — AI editing modal
- `src/components/Settings.tsx` — Editor settings panel with Claude path config
- `src-tauri/src/lib.rs` — All Rust/Tauri commands

### Component Layers
- `src/components/tiptap-ui/` — Rich toolbar components (headings, lists, links, colors, etc.)
- `src/components/tiptap-ui-primitive/` — Base UI primitives (button, toolbar, popover, etc.)
- `src/components/tiptap-node/` — Custom TipTap node renderers
- `src/components/tiptap-extension/` — Custom TipTap extensions
- `src/components/tiptap-icons/` — SVG icon components

### Supported File Formats
`.md`, `.markdown`, `.txt`
