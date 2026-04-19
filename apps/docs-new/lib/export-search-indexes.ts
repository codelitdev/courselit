import type { OramaDocument } from "fumadocs-core/search/orama-cloud";
import { source } from "@/lib/source";

const includedUrls = new Set([
    "/",
    "/blog/introduction",
    "/communities/introduction",
    "/courses/introduction",
    "/developers/introduction",
    "/downloads/introduction",
    "/email-marketing/introduction",
    "/getting-started/features",
    "/getting-started/quick-start",
    "/schools/add-custom-domain",
    "/schools/introduction",
    "/schools/set-up-payments",
    "/schools/sso",
    "/self-hosting/introduction",
    "/self-hosting/self-host",
    "/users/introduction",
    "/website/introduction",
    "/website/sales-pages",
    "/downloads/lead-magnet",
    "/email-marketing/broadcasts",
]);

export async function exportSearchIndexes(): Promise<OramaDocument[]> {
    return source
        .getPages()
        .filter((page: any) => includedUrls.has(page.url))
        .map((page: any) => ({
            id: page.url,
            structured: page.data.structuredData,
            url: page.url,
            title: page.data.title,
            description: page.data.description,
        }));
}
