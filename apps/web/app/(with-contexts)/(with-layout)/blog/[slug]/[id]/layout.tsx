import type { Metadata, ResolvingMetadata } from "next";
import { ReactNode } from "react";
import { FetchBuilder } from "@courselit/utils";
import { headers } from "next/headers";
import { getSiteInfo } from "@ui-lib/utils";
import { Course } from "@courselit/common-models";
import { getAddressFromHeaders } from "@/app/actions";

export async function generateMetadata(
    props: { params: Promise<{ id: string }> },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const params = await props.params;
    const address = await getAddressFromHeaders(headers);
    const [product, siteInfo] = await Promise.all([
        getProduct(params.id, address),
        getSiteInfo(address),
    ]);

    return {
        title: `${product ? product.title : "Post not found"} | ${(await parent)?.title?.absolute}`,
        openGraph: {
            title: `${product?.title || "Post not found"} | ${(await parent)?.title?.absolute}`,
            images: [
                {
                    url:
                        product?.featuredImage?.file ||
                        siteInfo?.logo?.file ||
                        "",
                    alt:
                        product?.featuredImage?.caption ||
                        siteInfo?.logo?.caption ||
                        "",
                },
            ],
        },
        twitter: {
            title: `${product?.title || "Post not found"} | ${(await parent)?.title?.absolute}`,
            images: [
                {
                    url:
                        product?.featuredImage?.file ||
                        siteInfo?.logo?.file ||
                        "",
                    alt:
                        product?.featuredImage?.caption ||
                        siteInfo?.logo?.caption ||
                        "",
                },
            ],
        },
    };
}

async function getProduct(id: string, address: string): Promise<Course | null> {
    const query = `
            query ($id: String!) {
                product: getCourse(id: $id) {
                    courseId
                    title
                    description
                    slug
                    featuredImage {
                        thumbnail
                        file
                    }
                    updatedAt
                }
            }
        `;
    const fetch = new FetchBuilder()
        .setUrl(`${address}/api/graph`)
        .setPayload({ query, variables: { id } })
        .setIsGraphQLEndpoint(true)
        .build();
    try {
        const response = await fetch.exec();
        return response.product;
    } catch (err: any) {
        return null;
    }
}

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
