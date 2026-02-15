# MarkSlate

A distraction-free markdown editor built with Tauri, React, and TipTap.

## Features

- Rich text editing with TipTap (headings, lists, tables, images, code blocks, etc.)
- AI-powered text editing via Claude CLI (select text, give an instruction, get a rewrite)
- Auto-save with dirty state tracking
- Customizable editor settings (font size, line height, line width, spacing, indent)
- Dark mode support
- Native file open/save dialogs
- Markdown import/export

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri CLI](https://tauri.app/start/)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (required for AI features)

## Development

```bash
# Install dependencies
bun install

# Run in dev mode
bun run tauri dev

# Build for production
bun run tauri build
```

## AI Integration

MarkSlate uses the Claude CLI (`claude -p`) for AI-powered text editing. When you select text and open the AI popup (via the toolbar or shortcut), your instruction is sent to Claude which returns the modified text.

**Requirements:**
- Claude Code must be installed and authenticated (`claude` available in PATH)
- No API key configuration needed — the CLI uses your existing Claude Code auth

**How it works:**
- The Tauri backend spawns `claude -p` as a subprocess
- The selected text, document context, and your instruction are sent via stdin
- Claude's response replaces the selected text

**Debugging AI issues in production builds:**

On macOS, the built `.app` doesn't inherit your shell PATH. MarkSlate automatically searches common locations (`~/.local/bin`, `/usr/local/bin`, `/opt/homebrew/bin`). To see logs from the built app, run it from the terminal:

```bash
# Run the built app with visible logs
/Applications/MarkSlate.app/Contents/MacOS/MarkSlate 2>&1 | grep markslate
```

## Tech Stack

- **Frontend:** React 19, TipTap 3, Tailwind CSS 4, Zustand
- **Backend:** Tauri 2 (Rust)
- **AI:** Claude CLI (Claude Code)
