use std::io::Write;
use std::process::{Command, Stdio};
use tauri::Manager;

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

#[tauri::command]
async fn modify_text_with_ai(
    selected_text: String,
    instruction: String,
    full_context: String,
    claude_path: Option<String>,
) -> Result<String, String> {
    let prompt = format!(
        "You are editing a markdown document. Here is the full document for context:\n\n\
         ---\n{}\n---\n\n\
         The user has selected the following text:\n\n\
         ---\n{}\n---\n\n\
         Instruction: {}\n\n\
         Return ONLY the modified replacement text. No explanations, no code blocks.",
        full_context, selected_text, instruction
    );

    let system_prompt = "You are a markdown editing assistant. You receive selected text from a document and an instruction. Return ONLY the modified text that should replace the selection. No explanations, no markdown code fences, no extra formatting.";

    tauri::async_runtime::spawn_blocking(move || {
        let extended_path = build_extended_path();
        eprintln!("[markslate] AI request starting, PATH: {}", extended_path);

        // Use provided claude_path if non-empty, otherwise default to "claude"
        let cmd = match &claude_path {
            Some(p) if !p.is_empty() => {
                eprintln!("[markslate] Using custom claude path: {}", p);
                p.clone()
            }
            _ => {
                eprintln!("[markslate] Using default claude command from PATH");
                "claude".to_string()
            }
        };

        let mut child = Command::new(&cmd)
            .args([
                "-p",
                "--model",
                "claude-sonnet-4-5-20250929",
                "--system-prompt",
                system_prompt,
                "--no-session-persistence",
            ])
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
                eprintln!("[markslate] {}", msg);
                msg
            })?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(prompt.as_bytes())
                .map_err(|e| format!("Failed to write to claude stdin: {}", e))?;
        }

        let output = child
            .wait_with_output()
            .map_err(|e| format!("Failed to read claude output: {}", e))?;

        eprintln!(
            "[markslate] claude exited with status: {}, stdout len: {}, stderr len: {}",
            output.status,
            output.stdout.len(),
            output.stderr.len()
        );

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let msg = format!("Claude exited with error: {}", stderr);
            eprintln!("[markslate] {}", msg);
            return Err(msg);
        }

        let result = String::from_utf8_lossy(&output.stdout).trim().to_string();

        if result.is_empty() {
            eprintln!("[markslate] Claude returned empty output");
            return Err("Claude returned empty output".to_string());
        }

        eprintln!("[markslate] AI request completed successfully ({} bytes)", result.len());
        Ok(result)
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
        .invoke_handler(tauri::generate_handler![greet, modify_text_with_ai, detect_claude_path, validate_claude_path])
        .setup(move |app| {
            if let Some(window) = app.webview_windows().values().next() {
                let _ = window.set_icon(icon);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
