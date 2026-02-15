import { query } from "@anthropic-ai/claude-agent-sdk";

export async function modifyText(
  selectedText: string,
  instruction: string,
  fullContext: string,
  apiKey?: string
): Promise<string> {
  const env: Record<string, string | undefined> = { ...process.env };
  if (apiKey) {
    env.ANTHROPIC_API_KEY = apiKey;
  }

  let result = "";
  for await (const message of query({
    prompt: `You are editing a markdown document. Here is the full document for context:\n\n---\n${fullContext}\n---\n\nThe user has selected the following text:\n\n---\n${selectedText}\n---\n\nInstruction: ${instruction}\n\nReturn ONLY the modified replacement text. No explanations, no code blocks.`,
    options: {
      tools: [],
      maxTurns: 1,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      systemPrompt:
        "You are a markdown editing assistant. You receive selected text from a document and an instruction. Return ONLY the modified text that should replace the selection. No explanations, no markdown code fences, no extra formatting.",
      model: "claude-sonnet-4-5-20250929",
      env,
    },
  })) {
    if (message.type === "result" && message.subtype === "success") {
      result = message.result;
    }
  }

  return result.trim();
}
