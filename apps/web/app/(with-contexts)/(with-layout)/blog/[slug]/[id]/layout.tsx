import type { Metadata, ResolvingMetadata } from "next";
import { ReactNode } from "react";
import { FetchBuilder } from "@courselit/utils";
import { headers } from "next/headers";
import { getAddressFromHeaders } from "@ui-lib/utils";
import { Course } from "@courselit/common-models";

export async function generateMetadata(
    { params }: { params: { id: string } },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const address = getAddressFromHeaders(headers);
    const product = await getProduct(params.id, address);

    return {
        title: `${product ? product.title : "Post not found"} | ${(await parent)?.title?.absolute}`,
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
                    creatorName
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
