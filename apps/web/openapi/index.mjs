import { userApiOpenApi } from "../app/api/user/openapi.mjs";

const routeSpecs = [userApiOpenApi];

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
