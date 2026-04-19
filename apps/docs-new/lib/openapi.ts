import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { createOpenAPI } from "fumadocs-openapi/server";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const openapiSpecPath = path.resolve(
    currentDir,
    "../../web/openapi/generated/openapi.json",
);

export const openapi = createOpenAPI({
    input: () => {
        const spec = JSON.parse(fs.readFileSync(openapiSpecPath, "utf8"));

        return {
            [openapiSpecPath]: {
                ...spec,
                servers: [
                    {
                        url: "https://school.courselit.app",
                        description: "CourseLit school origin",
                    },
                ],
            },
        };
    },
});
