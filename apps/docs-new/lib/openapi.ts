import path from "path";
import { fileURLToPath } from "url";
import { createOpenAPI } from "fumadocs-openapi/server";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const openapiSpecPath = path.resolve(
    currentDir,
    "../../web/openapi/generated/openapi.json",
);

export const openapi = createOpenAPI({
    input: [openapiSpecPath],
});
