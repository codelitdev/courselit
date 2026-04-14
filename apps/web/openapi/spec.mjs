import { buildOpenApiRoutes } from "./index.mjs";

const routeSpec = buildOpenApiRoutes();

export const openapiSpec = {
    openapi: "3.0.3",
    info: {
        title: "CourseLit REST API",
        version: "1.0.0",
        description:
            "OpenAPI documentation for the public CourseLit REST API surface.",
    },
    servers: [
        {
            url: "/",
            description: "Current CourseLit school origin",
        },
    ],
    tags: routeSpec.tags,
    paths: routeSpec.paths,
    components: {
        ...(routeSpec.components ?? {}),
        securitySchemes: {
            ...(routeSpec.components?.securitySchemes ?? {}),
            ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "x-api-key",
                description:
                    "API key created in CourseLit dashboard settings. The legacy `apikey` request-body field is still accepted but deprecated.",
            },
        },
    },
};
