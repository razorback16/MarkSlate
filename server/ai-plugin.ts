import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import { modifyText } from "./ai-handler";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

export function aiPlugin(): Plugin {
  return {
    name: "ai-plugin",
    configureServer(server) {
      server.middlewares.use("/api/ai", async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const body = await readBody(req);
          const { selectedText, instruction, fullContext, apiKey } = JSON.parse(body);

          if (!selectedText || !instruction) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "selectedText and instruction are required" }));
            return;
          }

          const result = await modifyText(selectedText, instruction, fullContext || "", apiKey);

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ result }));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}
