export async function modifyTextWithAI({
  selectedText,
  instruction,
  fullContext,
  apiKey,
}: {
  selectedText: string;
  instruction: string;
  fullContext: string;
  apiKey?: string;
}): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedText, instruction, fullContext, apiKey }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "AI request failed");
  }

  return data.result;
}
