use std::sync::{Arc, OnceLock};
use std::time::Instant;
use tauri::{Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::Mutex;

static APP_START: OnceLock<Instant> = OnceLock::new();

fn ts() -> String {
    let elapsed = APP_START.get_or_init(Instant::now).elapsed().as_secs_f64();
    format!("{:.1}s", elapsed)
}

macro_rules! tlog {
    ($($arg:tt)*) => {
        eprintln!("[markslate @{}] {}", ts(), format!($($arg)*))
    };
}

struct SidecarProcess {
    stdin: tokio::process::ChildStdin,
    child: tokio::process::Child,
}

struct AISidecarState(Arc<Mutex<Option<SidecarProcess>>>);

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Search common locations for a Node.js binary.
fn find_node_binary() -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/default".to_string());

    let candidates = [
        "/usr/local/bin/node".to_string(),
        "/opt/homebrew/bin/node".to_string(),
        format!("{}/.volta/bin/node", home),
        format!("{}/.bun/bin/node", home),
        format!("{}/.local/bin/node", home),
        format!("{}/.nvm/default/bin/node", home),
    ];

    for candidate in &candidates {
        let p = std::path::Path::new(candidate);
        if p.exists() {
            return Ok(candidate.clone());
        }
    }

    // Glob nvm versions
    let nvm_base = format!("{}/.nvm/versions/node", home);
    if let Ok(entries) = std::fs::read_dir(&nvm_base) {
        for entry in entries.flatten() {
            let bin = entry.path().join("bin/node");
            if bin.exists() {
                if let Some(s) = bin.to_str() {
                    return Ok(s.to_string());
                }
            }
        }
    }

    // Fallback: `which node`
    let current_path = std::env::var("PATH").unwrap_or_default();
    let extra = format!(
        "/usr/local/bin:/opt/homebrew/bin:{}/.volta/bin:{}/.bun/bin:{}/.nvm/versions/node/default/bin:{}",
        home, home, home, current_path
    );
    let output = std::process::Command::new("which")
        .arg("node")
        .env("PATH", &extra)
        .output()
        .map_err(|e| format!("Failed to run `which node`: {}", e))?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            return Ok(path);
        }
    }

    Err("Node.js not found. AI features require Node.js 18+.".to_string())
}

/// Search common locations for the Claude CLI binary.
fn find_claude_binary() -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/default".to_string());

    let candidates = [
        format!("{}/.claude/local/claude", home),
        format!("{}/.local/bin/claude", home),
        "/usr/local/bin/claude".to_string(),
        "/opt/homebrew/bin/claude".to_string(),
    ];

    for candidate in &candidates {
        let p = std::path::Path::new(candidate);
        if p.exists() {
            return Ok(candidate.clone());
        }
    }

    let current_path = std::env::var("PATH").unwrap_or_default();
    let extra = format!(
        "{}/.claude/local:{}/.local/bin:/usr/local/bin:/opt/homebrew/bin:{}",
        home, home, current_path
    );
    let output = std::process::Command::new("which")
        .arg("claude")
        .env("PATH", &extra)
        .output()
        .map_err(|e| format!("Failed to run `which claude`: {}", e))?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            return Ok(path);
        }
    }

    Err("Claude CLI not found. AI features require Claude Code to be installed.".to_string())
}

/// Resolve the sidecar script path.
fn resolve_sidecar_path(app: &tauri::AppHandle) -> Result<String, String> {
    let dev_path = std::env::current_dir()
        .map_err(|e| format!("Cannot get CWD: {}", e))?
        .parent()
        .map(|p| p.join("src-sidecar").join("ai-sidecar.mjs"))
        .unwrap_or_default();

    if dev_path.exists() {
        tlog!("Using dev sidecar path: {}", dev_path.display());
        return dev_path
            .to_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "Invalid sidecar path".to_string());
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("sidecar").join("ai-sidecar.mjs");
        tlog!("Checking bundled sidecar path: {}", bundled.display());
        if bundled.exists() {
            return bundled
                .to_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "Invalid sidecar path".to_string());
        }
    }

    let alt_path = std::path::PathBuf::from("../src-sidecar/ai-sidecar.mjs");
    if alt_path.exists() {
        return std::fs::canonicalize(&alt_path)
            .map_err(|e| format!("Cannot canonicalize: {}", e))?
            .to_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "Invalid sidecar path".to_string());
    }

    Err("Could not find ai-sidecar.mjs. Ensure src-sidecar/ exists.".to_string())
}

async fn spawn_sidecar(
    app: tauri::AppHandle,
    state: Arc<Mutex<Option<SidecarProcess>>>,
) -> Result<(), String> {
    let node_path = find_node_binary()?;
    let sidecar_path = resolve_sidecar_path(&app)?;

    tlog!("Spawning sidecar: {} {}", node_path, sidecar_path);

    let mut child = tokio::process::Command::new(&node_path)
        .arg(&sidecar_path)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "Failed to capture sidecar stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture sidecar stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture sidecar stderr".to_string())?;

    // Relay stdout JSON lines as Tauri events
    let app_clone = app.clone();
    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }
            let parsed: serde_json::Value = match serde_json::from_str(&line) {
                Ok(v) => v,
                Err(_) => {
                    tlog!("stdout non-JSON: {}", line);
                    continue;
                }
            };

            let event_type = parsed
                .get("type")
                .and_then(|t| t.as_str())
                .unwrap_or("");

            match event_type {
                "status" => {
                    if let Some(msg) = parsed.get("message").and_then(|m| m.as_str()) {
                        tlog!("-> ai-progress: {}", msg);
                        let _ = app_clone.emit("ai-progress", msg);
                    }
                }
                "edit_applied" => {
                    tlog!("-> ai-edit-applied");
                    if let Some(new_str) = parsed.get("newString").and_then(|s| s.as_str()) {
                        let _ = app_clone.emit("ai-edit-applied", new_str);
                    }
                }
                "result" | "error" => {
                    tlog!("-> ai-sidecar-response (type={})", event_type);
                    let _ = app_clone.emit("ai-sidecar-response", line.as_str());
                }
                "pong" => {
                    tlog!("Pong received");
                }
                "init_ok" => {
                    tlog!("Sidecar init acknowledged");
                }
                "session_ready" => {
                    tlog!("AI session ready");
                    let _ = app_clone.emit("ai-session-ready", "");
                }
                "context_cleared" => {
                    tlog!("AI context cleared");
                    let _ = app_clone.emit("ai-context-cleared", "");
                }
                _ => {
                    tlog!("Unknown sidecar event: {}", event_type);
                }
            }
        }
        tlog!("Sidecar stdout EOF — process likely exited");
    });

    // Log stderr
    tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            eprintln!("[sidecar-err @{}] {}", ts(), line);
        }
    });

    let mut guard = state.lock().await;
    *guard = Some(SidecarProcess { stdin, child });

    // Send init command with claude binary path
    if let Some(ref mut sidecar) = *guard {
        match find_claude_binary() {
            Ok(claude_path) => {
                let init_cmd = serde_json::json!({
                    "command": "init",
                    "claudePath": claude_path,
                });
                let init_line = format!("{}\n", init_cmd.to_string());
                if let Err(e) = sidecar.stdin.write_all(init_line.as_bytes()).await {
                    tlog!("Failed to send init command: {}", e);
                }
                if let Err(e) = sidecar.stdin.flush().await {
                    tlog!("Failed to flush init command: {}", e);
                }
                tlog!("Sent init with claude path: {}", claude_path);
            }
            Err(e) => {
                tlog!("Warning: Claude CLI not found ({}), sidecar will use bundled CLI", e);
            }
        }
    }

    tlog!("AI sidecar started successfully");
    Ok(())
}

#[tauri::command]
async fn start_ai_sidecar(
    app: tauri::AppHandle,
    state: tauri::State<'_, AISidecarState>,
) -> Result<(), String> {
    let state_arc = state.0.clone();

    {
        let guard = state_arc.lock().await;
        if guard.is_some() {
            tlog!("Sidecar already running");
            return Ok(());
        }
    }

    spawn_sidecar(app, state_arc).await
}

#[tauri::command]
async fn send_ai_edit(
    state: tauri::State<'_, AISidecarState>,
    markdown_content: String,
    instruction: String,
    selected_text: Option<String>,
    selection_line_start: Option<u32>,
    selection_line_end: Option<u32>,
) -> Result<(), String> {
    tlog!("send_ai_edit: instruction='{}', doc_len={}, selection={:?}",
        &instruction[..instruction.len().min(60)],
        markdown_content.len(),
        selected_text.as_ref().map(|s| s.len()));

    let mut guard = state.0.lock().await;
    let sidecar = guard
        .as_mut()
        .ok_or_else(|| "AI sidecar not running. Restart the app or check Node.js installation.".to_string())?;

    let cmd = serde_json::json!({
        "command": "edit",
        "markdownContent": markdown_content,
        "instruction": instruction,
        "selectedText": selected_text,
        "selectionLineStart": selection_line_start,
        "selectionLineEnd": selection_line_end,
    });

    let line = format!("{}\n", cmd.to_string());
    tlog!("Writing {} bytes to sidecar stdin", line.len());
    sidecar
        .stdin
        .write_all(line.as_bytes())
        .await
        .map_err(|e| format!("Failed to write to sidecar: {}", e))?;
    sidecar
        .stdin
        .flush()
        .await
        .map_err(|e| format!("Failed to flush sidecar stdin: {}", e))?;
    tlog!("Edit command sent to sidecar");

    Ok(())
}

#[tauri::command]
async fn cancel_ai_edit(state: tauri::State<'_, AISidecarState>) -> Result<(), String> {
    tlog!("cancel_ai_edit");
    let mut guard = state.0.lock().await;
    if let Some(sidecar) = guard.as_mut() {
        let line = "{\"command\":\"cancel\"}\n";
        sidecar
            .stdin
            .write_all(line.as_bytes())
            .await
            .map_err(|e| format!("Failed to send cancel: {}", e))?;
        sidecar
            .stdin
            .flush()
            .await
            .map_err(|e| format!("Failed to flush: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn stop_ai_sidecar(state: tauri::State<'_, AISidecarState>) -> Result<(), String> {
    tlog!("stop_ai_sidecar");
    let mut guard = state.0.lock().await;
    if let Some(mut sidecar) = guard.take() {
        drop(sidecar.stdin);
        let _ = sidecar.child.kill().await;
        tlog!("AI sidecar stopped");
    }
    Ok(())
}

#[tauri::command]
async fn clear_ai_context(state: tauri::State<'_, AISidecarState>) -> Result<(), String> {
    tlog!("clear_ai_context");
    let mut guard = state.0.lock().await;
    let sidecar = guard
        .as_mut()
        .ok_or_else(|| "AI sidecar not running.".to_string())?;

    let cmd = serde_json::json!({ "command": "clear_context" });
    let line = format!("{}\n", cmd.to_string());
    sidecar
        .stdin
        .write_all(line.as_bytes())
        .await
        .map_err(|e| format!("Failed to write to sidecar: {}", e))?;
    sidecar
        .stdin
        .flush()
        .await
        .map_err(|e| format!("Failed to flush sidecar stdin: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    APP_START.get_or_init(Instant::now);
    tlog!("App starting");

    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))
        .expect("failed to load icon");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AISidecarState(Arc::new(Mutex::new(None))))
        .invoke_handler(tauri::generate_handler![
            greet,
            start_ai_sidecar,
            send_ai_edit,
            cancel_ai_edit,
            stop_ai_sidecar,
            clear_ai_context
        ])
        .setup(move |app| {
            if let Some(window) = app.webview_windows().values().next() {
                let _ = window.set_icon(icon);
            }

            let app_handle = app.handle().clone();
            let state = app
                .state::<AISidecarState>()
                .0
                .clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = spawn_sidecar(app_handle, state).await {
                    tlog!("Failed to auto-start sidecar: {}", e);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
