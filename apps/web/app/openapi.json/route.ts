import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
    const openapiPath = path.join(
        process.cwd(),
        "openapi",
        "generated",
        "openapi.json",
    );
    const content = await readFile(openapiPath, "utf-8");

    return new Response(content, {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=0, must-revalidate",
        },
    });
}
