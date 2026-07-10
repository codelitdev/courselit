/**
 * @jest-environment node
 */

import { execFileSync } from "child_process";
import path from "path";
import { pathToFileURL } from "url";

function buildOpenApiRoutesForTest() {
    const openApiIndex = pathToFileURL(
        path.resolve(process.cwd(), "apps/web/openapi/index.mjs"),
    ).href;
    const output = execFileSync(
        process.execPath,
        [
            "--input-type=module",
            "-e",
            `import { buildOpenApiRoutes } from ${JSON.stringify(openApiIndex)}; console.log(JSON.stringify(buildOpenApiRoutes()));`,
        ],
        { encoding: "utf8" },
    );
    return JSON.parse(output);
}

describe("media OpenAPI documentation", () => {
    it("documents the existing media presigned upload endpoint", () => {
        const routes = buildOpenApiRoutesForTest();
        const endpoint = routes.paths["/api/media/presigned"].post;

        expect(endpoint).toMatchObject({
            tags: ["Media Uploads"],
            operationId: "createMediaUploadSignature",
            security: [{ ApiKeyAuth: [] }],
        });
        expect(endpoint.description).toContain("upload signature");
        expect(endpoint.description).toContain(
            "https://docs.medialit.cloud/api/uploadMedia",
        );
        expect(
            endpoint.responses[200].content["application/json"].schema.$ref,
        ).toBe("#/components/schemas/MediaPresignedResponse");
        expect(
            routes.components.schemas.MediaPresignedResponse.required,
        ).toEqual(["signature", "endpoint"]);
        expect(
            routes.components.schemas.MediaPresignedResponse.properties.endpoint
                .description,
        ).toContain("/media/create/resumable");
        expect(
            routes.components.securitySchemes?.CourseLitSessionAuth,
        ).toBeUndefined();
    });
});
