import { query } from "@anthropic-ai/claude-agent-sdk";
import * as readline from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

let activeQuery = null; // The single long-lived Query object
let messageResolve = null; // Resolves the next message promise in the async iterable
let storedClaudePath = null;
let pendingEditResolve = null; // Resolves when current edit completes
let currentSessionId = ""; // Updated as we receive messages
let editStartTime = null; // Track edit duration

function ts() {
  return new Date().toISOString();
}

function elapsed() {
  if (!editStartTime) return "";
  return ` (+${((Date.now() - editStartTime) / 1000).toFixed(1)}s)`;
}

function log(msg) {
  process.stderr.write(`[sidecar ${ts()}] ${msg}\n`);
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

// Build a proper SDKUserMessage object for the V1 async iterable
function makeUserMessage(text) {
  return {
    type: "user",
    uuid: crypto.randomUUID(),
    session_id: currentSessionId,
    message: {
      role: "user",
      content: [{ type: "text", text }],
    },
    parent_tool_use_id: null,
  };
}

// Creates an async iterable that yields SDKUserMessage objects on demand.
function createMessageStream() {
  const stream = {
    [Symbol.asyncIterator]() {
      return {
        next() {
          return new Promise((resolve) => {
            messageResolve = (sdkMessage) => {
              log(`Sending message to SDK${elapsed()}`);
              resolve({ done: false, value: sdkMessage });
            };
          });
        },
        return() {
          return Promise.resolve({ done: true, value: undefined });
        },
      };
    },
  };
  return stream;
}

function sendMessage(text) {
  if (messageResolve) {
    const resolve = messageResolve;
    messageResolve = null;
    resolve(makeUserMessage(text));
  } else {
    log(`Warning: sendMessage called but no pending resolve`);
  }
}

async function startSession() {
  log("Starting persistent session...");
  const tmpDir = "/tmp/markslate-ai";
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const messageStream = createMessageStream();

  const options = {
    ...(storedClaudePath && { pathToClaudeCodeExecutable: storedClaudePath }),
    model: "claude-sonnet-4-5-20250929",
    allowedTools: ["Edit", "Read"],
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    cwd: tmpDir,
    settingSources: [],
    systemPrompt:
      "You are a markdown editor assistant. When asked to edit, Read the file first, then use the Edit tool to modify it. Do not output the edited text — just read and edit.",
    includePartialMessages: true,
  };

  log("Calling query() with persistent message stream...");
  activeQuery = query({ prompt: messageStream, options });

  // Background loop: iterate over messages from the query
  (async () => {
    try {
      let sessionReady = false;
      for await (const message of activeQuery) {
        if (message.type === "system" && !sessionReady) {
          sessionReady = true;
          emit({ type: "session_ready" });
          log("Session ready (system message received)");
          continue;
        }

        // Track session_id from any message that carries one
        if (message.session_id) {
          currentSessionId = message.session_id;
        }

        if (message.type === "assistant") {
          const content = message.message?.content;
          if (Array.isArray(content)) {
            for (const item of content) {
              if (item.type === "tool_use") {
                const toolName = item.name;
                log(`Tool use: ${toolName}${elapsed()}`);
                if (toolName === "Edit") {
                  emit({ type: "status", message: "Editing document..." });
                } else if (toolName === "Read") {
                  emit({ type: "status", message: "Reading document..." });
                }
              } else if (item.type === "text") {
                log(`Assistant text response${elapsed()}`);
                emit({ type: "status", message: "Thinking..." });
              }
            }
          }
        } else if (message.type === "result") {
          log(`Result received (subtype: ${message.subtype})${elapsed()}`);
          // A result means the current turn is complete
          const tmpDir = "/tmp/markslate-ai";
          const filePath = path.join(tmpDir, "current-document.md");
          let fileContent;
          try {
            fileContent = fs.readFileSync(filePath, "utf-8");
          } catch {
            fileContent = null;
          }

          if (message.subtype === "clear") {
            emit({ type: "context_cleared" });
            log("Context cleared");
          } else if (pendingEditResolve) {
            log(`Edit complete, read back file (${fileContent?.length ?? 0} bytes)${elapsed()}`);
            emit({
              type: "result",
              content: fileContent,
              sessionId: message.session_id || null,
              isError: message.subtype !== "success",
            });
          }

          editStartTime = null;
          if (pendingEditResolve) {
            pendingEditResolve();
            pendingEditResolve = null;
          }
        } else {
          log(`Message type: ${message.type}${elapsed()}`);
        }
      }
    } catch (err) {
      log(`Background loop error: ${err.message}`);
      emit({ type: "error", message: err.message });
    }
  })();
}

function handlePing() {
  emit({ type: "pong" });
}

function handleCancel() {
  if (activeQuery) {
    activeQuery.interrupt();
  }
}

function handleInit(cmd) {
  if (cmd.claudePath) {
    storedClaudePath = cmd.claudePath;
    log(`Claude path set to: ${storedClaudePath}`);
  }
  emit({ type: "init_ok" });

  // Start the persistent session
  startSession();
}

async function handleEdit(cmd) {
  const {
    markdownContent,
    instruction,
    selectedText,
    selectionLineStart,
    selectionLineEnd,
  } = cmd;

  const tmpDir = "/tmp/markslate-ai";
  const filePath = path.join(tmpDir, "current-document.md");

  try {
    editStartTime = Date.now();
    log(`Edit received: "${instruction.substring(0, 80)}${instruction.length > 80 ? '...' : ''}"`);
    log(`Document size: ${markdownContent.length} chars, selection: ${selectedText ? `lines ${selectionLineStart}-${selectionLineEnd}` : 'none'}`);

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    fs.writeFileSync(filePath, markdownContent, "utf-8");
    log(`Wrote temp file${elapsed()}`);

    // Build prompt
    let prompt = `The markdown file is at: ${filePath}\n\nRead the file, then use the Edit tool to modify it. Do NOT output the edited text — use the Edit tool to make changes in place.\n\n`;

    if (selectedText) {
      prompt += `The user has selected the following text (lines ${selectionLineStart}-${selectionLineEnd}):\n---\n${selectedText}\n---\n\n`;
    }

    prompt += `Instruction: ${instruction}`;

    // Create a promise that resolves when the edit result comes back
    const editDone = new Promise((resolve) => {
      pendingEditResolve = resolve;
    });

    log(`Sending prompt to SDK${elapsed()}`);
    sendMessage(prompt);
    await editDone;
    log(`Edit fully resolved${elapsed()}`);
  } catch (err) {
    log(`Edit error: ${err.message}${elapsed()}`);
    emit({ type: "error", message: err.message });
  }
}

async function handleClearContext() {
  try {
    log("Clearing context...");
    const clearDone = new Promise((resolve) => {
      pendingEditResolve = resolve;
    });
    sendMessage("/clear");
    await clearDone;
    log("Context clear complete");
  } catch (err) {
    log(`Clear context error: ${err.message}`);
    emit({ type: "error", message: err.message });
  }
}

// Main readline loop
const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on("line", async (line) => {
  try {
    const cmd = JSON.parse(line);
    switch (cmd.command) {
      case "ping":
        handlePing();
        break;
      case "cancel":
        handleCancel();
        break;
      case "edit":
        await handleEdit(cmd);
        break;
      case "init":
        handleInit(cmd);
        break;
      case "clear_context":
        await handleClearContext();
        break;
      default:
        emit({ type: "error", message: `Unknown command: ${cmd.command}` });
    }
  } catch (err) {
    emit({ type: "error", message: `Parse error: ${err.message}` });
  }
});

rl.on("close", () => {
  log("stdin closed, exiting");
  process.exit(0);
});

log("Ready, waiting for commands on stdin");
