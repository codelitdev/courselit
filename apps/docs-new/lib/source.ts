import { docs } from "../.source/server";
import { loader, multiple } from "fumadocs-core/source";
import { createElement } from "react";
import { icons } from "lucide-react";
import { openapiPlugin, openapiSource } from "fumadocs-openapi/server";
import { openapi } from "@/lib/openapi";

const apiSource: any = await openapiSource(openapi, {
    baseDir: "api-reference",
});

export const source: any = loader({
    baseUrl: "/",
    source: multiple({
        docs: docs.toFumadocsSource() as any,
        openapi: apiSource,
    }) as any,
    plugins: [openapiPlugin()],
    icon(icon) {
        if (icon && icon in icons) {
            return createElement(icons[icon as keyof typeof icons]);
        }
    },
});
