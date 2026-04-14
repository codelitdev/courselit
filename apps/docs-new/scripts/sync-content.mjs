import { OramaCloud } from "@orama/core";
import { sync } from "fumadocs-core/search/orama-cloud";
import fs from "node:fs/promises";
import path from "node:path";

const requiredEnvVars = [
    "NEXT_PUBLIC_ORAMA_PROJECT_ID",
    "NEXT_PUBLIC_ORAMA_DATASOURCE_ID",
    "ORAMA_PRIVATE_API_KEY",
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
    throw new Error(
        `[orama] Missing required env vars: ${missingEnvVars.join(", ")}`,
    );
}

const filePath = path.join(".next", "server", "app", "static.json.body");

async function main() {
    const orama = new OramaCloud({
        projectId: process.env.NEXT_PUBLIC_ORAMA_PROJECT_ID,
        apiKey: process.env.ORAMA_PRIVATE_API_KEY,
    });

    const content = await fs.readFile(filePath, "utf8");
    const records = JSON.parse(content);

    await sync(orama, {
        index: process.env.NEXT_PUBLIC_ORAMA_DATASOURCE_ID,
        documents: records,
    });

    console.log(`[orama] search updated: ${records.length} records`);
}

void main();
