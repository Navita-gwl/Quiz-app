import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

async function readPublicAsset(filename: string): Promise<string> {
  const candidates = [
    join(process.cwd(), "build/client", filename),
    join(process.cwd(), "public", filename),
  ];

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      return readFile(filePath, "utf-8");
    }
  }

  throw new Error(`Public asset not found: ${filename}`);
}

export async function servePublicAsset(
  filename: string,
  contentType: string,
): Promise<Response> {
  const content = await readPublicAsset(filename);
  return new Response(content, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
}
