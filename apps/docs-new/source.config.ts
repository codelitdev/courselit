import { defineDocs, defineConfig } from "fumadocs-mdx/config";

export const docs: any = defineDocs({
    dir: "content/docs",
    docs: {
        postprocess: {
            includeProcessedMarkdown: true,
        },
    },
});

export default defineConfig({
    mdxOptions: {},
});
