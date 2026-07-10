import { userApiOpenApi } from "../app/api/user/openapi.mjs";
import { productsApiOpenApi } from "../app/api/products/openapi.mjs";
import { mediaApiOpenApi } from "../app/api/media/openapi.mjs";

const routeSpecs = [userApiOpenApi, productsApiOpenApi, mediaApiOpenApi];

function mergeOpenApiFragments(fragments) {
    return fragments.reduce(
        (acc, fragment) => ({
            tags: [...acc.tags, ...(fragment.tags ?? [])],
            paths: {
                ...acc.paths,
                ...(fragment.paths ?? {}),
            },
            components: {
                ...acc.components,
                ...(fragment.components ?? {}),
                parameters: {
                    ...(acc.components?.parameters ?? {}),
                    ...(fragment.components?.parameters ?? {}),
                },
                schemas: {
                    ...(acc.components?.schemas ?? {}),
                    ...(fragment.components?.schemas ?? {}),
                },
                securitySchemes: {
                    ...(acc.components?.securitySchemes ?? {}),
                    ...(fragment.components?.securitySchemes ?? {}),
                },
            },
        }),
        {
            tags: [],
            paths: {},
            components: {},
        },
    );
}

export function buildOpenApiRoutes() {
    return mergeOpenApiFragments(routeSpecs);
}
