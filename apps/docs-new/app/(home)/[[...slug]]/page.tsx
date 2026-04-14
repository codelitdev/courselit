import { source } from "@/lib/source";
import {
    DocsBody,
    DocsDescription,
    DocsPage,
    DocsTitle,
} from "fumadocs-ui/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { notFound, redirect } from "next/navigation";
import { APIPage } from "@/components/api-page";
import { getMDXComponents } from "@/mdx-components";

const API_REFERENCE_INDEX = "/api-reference/createUser";

export default async function Page(props: {
    params: Promise<{ slug?: string[] }>;
}) {
    const params = await props.params;
    const slugPath = params.slug?.join("/");

    if (slugPath === "api-reference" || slugPath === "rest-api") {
        redirect(API_REFERENCE_INDEX);
    }

    const page = source.getPage(params.slug);
    if (!page) notFound();

    if (page.data.type === "openapi") {
        return (
            <DocsPage full>
                <DocsTitle>{page.data.title}</DocsTitle>
                <DocsDescription>{page.data.description}</DocsDescription>
                <DocsBody>
                    <APIPage {...page.data.getAPIPageProps()} />
                </DocsBody>
            </DocsPage>
        );
    }

    const MDXContent = page.data.body;

    return (
        <DocsPage toc={page.data.toc} full={page.data.full}>
            <DocsTitle>{page.data.title}</DocsTitle>
            <DocsDescription>{page.data.description}</DocsDescription>
            <DocsBody>
                <MDXContent
                    components={getMDXComponents({
                        a: createRelativeLink(source, page),
                    })}
                />
            </DocsBody>
        </DocsPage>
    );
}

export async function generateStaticParams() {
    const params = source.generateParams();
    const bySlug = new Map<string, { slug?: string[] }>();

    for (const param of [
        { slug: [] as string[] },
        ...params,
        { slug: ["api-reference"] },
        { slug: ["rest-api"] },
    ]) {
        bySlug.set((param.slug ?? []).join("/"), param);
    }

    return [...bySlug.values()];
}

export async function generateMetadata(props: {
    params: Promise<{ slug?: string[] }>;
}) {
    const params = await props.params;

    if (params.slug?.join("/") === "api-reference") {
        return {
            title: "API Reference",
            description: "Interactive REST API documentation for CourseLit.",
        };
    }

    const page = source.getPage(params.slug);
    if (!page) notFound();

    return {
        title: page.data.title,
        description: page.data.description,
    };
}
