use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use tauri::{Emitter, Manager};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(unix)]
fn is_executable(path: &std::path::Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    std::fs::metadata(path)
        .map(|m| m.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

/// Build a PATH string that includes common locations for the `claude` CLI.
/// macOS .app bundles don't inherit the user's shell PATH, so we need to
/// explicitly include directories like ~/.local/bin, ~/.nvm/*, homebrew paths, etc.
fn build_extended_path() -> String {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/default".to_string());
    let current_path = std::env::var("PATH").unwrap_or_default();

    let extra_dirs = [
        format!("{}/.local/bin", home),
        "/usr/local/bin".to_string(),
        "/opt/homebrew/bin".to_string(),
        "/opt/homebrew/sbin".to_string(),
        format!("{}/bin", home),
        "/usr/local/lib/node_modules/.bin".to_string(),
        format!("{}/.npm-global/bin", home),
        format!("{}/.volta/bin", home),
        format!("{}/.bun/bin", home),
        format!("{}/.cargo/bin", home),
        format!("{}/.nvm/versions/node/default/bin", home),
    ];

    let mut parts: Vec<&str> = extra_dirs.iter().map(|s| s.as_str()).collect();
    if !current_path.is_empty() {
        parts.push(&current_path);
    }
    parts.join(":")
}

#[tauri::command]
async fn detect_claude_path() -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME environment variable not set".to_string())?;

    // Candidate directories to search for the claude binary
    let mut candidate_dirs: Vec<String> = vec![
        format!("{}/.local/bin", home),
        "/usr/local/bin".to_string(),
        "/opt/homebrew/bin".to_string(),
        "/opt/homebrew/sbin".to_string(),
        format!("{}/bin", home),
        "/usr/local/lib/node_modules/.bin".to_string(),
        format!("{}/.npm-global/bin", home),
        format!("{}/.volta/bin", home),
        format!("{}/.bun/bin", home),
        format!("{}/.cargo/bin", home),
    ];

    // Glob ~/.nvm/versions/node/*/bin to find any node version directories
    let nvm_base = format!("{}/.nvm/versions/node", home);
    if let Ok(entries) = std::fs::read_dir(&nvm_base) {
        for entry in entries.flatten() {
            let bin_dir = entry.path().join("bin");
            if bin_dir.is_dir() {
                if let Some(s) = bin_dir.to_str() {
                    candidate_dirs.push(s.to_string());
                }
            }
        }
    }

    // Direct scan: check each candidate directory for claude binary
    for dir in &candidate_dirs {
        let candidate = std::path::PathBuf::from(dir).join("claude");
        if candidate.exists() && is_executable(&candidate) {
            if let Some(path_str) = candidate.to_str() {
                eprintln!("[markslate] detect_claude_path: found claude at {}", path_str);
                return Ok(path_str.to_string());
            }
        }
    }

    eprintln!("[markslate] detect_claude_path: direct scan failed, falling back to `which claude`");

    // Fallback: run `which claude` with extended PATH
    let extended_path = build_extended_path();
    let output = Command::new("which")
        .arg("claude")
        .env("PATH", &extended_path)
        .output()
        .map_err(|e| format!("Failed to run `which claude`: {}", e))?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            eprintln!("[markslate] detect_claude_path: `which` found claude at {}", path);
            return Ok(path);
        }
    }

    Err(
        "Could not find the Claude CLI. Please install it (https://docs.anthropic.com/en/docs/claude-code) \
         or set the path manually in Settings."
            .to_string(),
    )
}

#[tauri::command]
async fn validate_claude_path(path: String) -> Result<bool, String> {
    let p = std::path::PathBuf::from(&path);
    Ok(p.exists() && is_executable(&p))
}

#[derive(serde::Serialize)]
struct EditResult {
    content: String,
    session_id: Option<String>,
}

#[tauri::command]
async fn edit_with_ai(
    app: tauri::AppHandle,
    markdown_content: String,
    instruction: String,
    selection_line_start: Option<u32>,
    selection_line_end: Option<u32>,
    selected_text: Option<String>,
    claude_path: Option<String>,
    workspace_path: Option<String>,
    session_id: Option<String>,
) -> Result<EditResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let temp_dir = std::env::temp_dir().join("markslate-ai");
        std::fs::create_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to create temp dir: {}", e))?;

        let temp_file = temp_dir.join("current-document.md");
        std::fs::write(&temp_file, &markdown_content)
            .map_err(|e| format!("Failed to write temp file: {}", e))?;

        let temp_file_str = temp_file.to_string_lossy().to_string();

        // Build prompt with selection context
        let selection_context = match (&selected_text, selection_line_start, selection_line_end) {
            (Some(text), Some(start), Some(end)) => format!(
                "\n\nThe user has selected the following text (lines {}-{}):\n---\n{}\n---",
                start, end, text
            ),
            (Some(text), _, _) => format!(
                "\n\nThe user has selected the following text:\n---\n{}\n---",
                text
            ),
            _ => String::new(),
        };

        let prompt = format!(
            "The markdown file is at: {}\n\n\
             First, Read the file to see its contents. Then use the Edit tool to modify it. \
             Do NOT output the edited text — use the Edit tool to make changes in place.{}\n\n\
             Instruction: {}",
            temp_file_str, selection_context, instruction
        );



        // Write empty MCP config file for --strict-mcp-config
        let mcp_config_file = temp_dir.join("empty-mcp.json");
        if !mcp_config_file.exists() {
            let _ = std::fs::write(&mcp_config_file, r#"{"mcpServers":{}}"#);
        }
        let mcp_config_path = mcp_config_file.to_string_lossy().to_string();

        // Build CLI args — use stream-json for real-time progress
        // Stripped to bare minimum: no MCP, no skills, no hooks, no project context
        let mut args: Vec<String> = vec![
            "-p".to_string(),
            "--model".to_string(),
            "claude-sonnet-4-5-20250929".to_string(),
            "--output-format".to_string(),
            "stream-json".to_string(),
            "--verbose".to_string(), // required by stream-json
            "--allowedTools".to_string(),
            "Edit,Read".to_string(),
            "--tools".to_string(),
            "Edit,Read".to_string(),
            "--disable-slash-commands".to_string(),
            "--strict-mcp-config".to_string(),
            "--mcp-config".to_string(),
            mcp_config_path,
            "--no-chrome".to_string(),
            "--setting-sources".to_string(),
            String::new(),
        ];

        if let Some(ref sid) = session_id {
            args.push("--resume".to_string());
            args.push(sid.clone());
            // Cannot change system prompt on resume
        } else {
            args.push("--system-prompt".to_string());
            args.push(
                "You are a markdown editor. First Read the file, then use the Edit tool to modify it. Do not output explanations — just read and edit.".to_string()
            );
        }

        // Always use temp_dir as working directory to avoid loading CLAUDE.md from project tree
        let _ = workspace_path; // kept in API signature for frontend compat
        let work_dir = temp_dir.clone();

        let extended_path = build_extended_path();

        // Resolve claude command
        let cmd = match &claude_path {
            Some(p) if !p.is_empty() => p.clone(),
            _ => "claude".to_string(),
        };

        let mut child = Command::new(&cmd)
            .args(&args)
            .current_dir(&work_dir)
            .env("PATH", &extended_path)
            .env_remove("CLAUDECODE")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| {
                let msg = if e.kind() == std::io::ErrorKind::NotFound {
                    format!(
                        "Claude CLI not found in PATH. Searched: {}. Please install Claude Code: https://docs.anthropic.com/en/docs/claude-code",
                        extended_path
                    )
                } else {
                    format!("Failed to spawn claude process: {}", e)
                };
                msg
            })?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(prompt.as_bytes())
                .map_err(|e| format!("Failed to write to claude stdin: {}", e))?;
        }

        // Stream stdout line-by-line and emit progress events
        let stdout = child.stdout.take()
            .ok_or_else(|| "Failed to capture claude stdout".to_string())?;
        let reader = BufReader::new(stdout);

        let mut result_session_id: Option<String> = None;

        for line in reader.lines() {
            let line = match line {
                Ok(l) => l,
                Err(_) => continue,
            };

            if line.trim().is_empty() {
                continue;
            }

            let parsed: serde_json::Value = match serde_json::from_str(&line) {
                Ok(v) => v,
                Err(_) => continue,
            };

            let event_type = parsed.get("type").and_then(|t| t.as_str()).unwrap_or("");

            match event_type {
                "assistant" => {
                    // Check what the assistant is doing
                    if let Some(content) = parsed.pointer("/message/content") {
                        if let Some(arr) = content.as_array() {
                            for item in arr {
                                let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
                                match item_type {
                                    "tool_use" => {
                                        let tool_name = item.get("name").and_then(|n| n.as_str()).unwrap_or("unknown");
                                        let status = match tool_name {
                                            "Edit" => "Editing document...".to_string(),
                                            "Read" => "Reading document...".to_string(),
                                            "Glob" => "Exploring files...".to_string(),
                                            _ => format!("Using {}...", tool_name),
                                        };
                                        let _ = app.emit("ai-progress", &status);
                                    }
                                    "text" => {
                                        let _ = app.emit("ai-progress", "Thinking...");
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }
                }
                "result" => {
                    result_session_id = parsed.get("session_id")
                        .and_then(|s| s.as_str())
                        .map(|s| s.to_string());
                    let _ = app.emit("ai-progress", "Done");
                }
                "user" => {
                    if let Some(new_str) = parsed.pointer("/tool_use_result/newString").and_then(|s| s.as_str()) {
                        if !new_str.is_empty() {
                            let _ = app.emit("ai-edit-applied", new_str);
                        }
                    }
                }
                _ => {}
            }
        }

        // Wait for process to finish
        let status = child.wait()
            .map_err(|e| format!("Failed to wait for claude process: {}", e))?;

        if !status.success() {
            return Err("Claude exited with error".to_string());
        }

        // Read back the edited file
        let content = std::fs::read_to_string(&temp_file)
            .map_err(|e| format!("Failed to read back edited file: {}", e))?;

        // Clean up
        let _ = std::fs::remove_file(&temp_file);



        Ok(EditResult {
            content,
            session_id: result_session_id,
        })
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))
        .expect("failed to load icon");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, edit_with_ai, detect_claude_path, validate_claude_path])
        .setup(move |app| {
            if let Some(window) = app.webview_windows().values().next() {
                let _ = window.set_icon(icon);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
