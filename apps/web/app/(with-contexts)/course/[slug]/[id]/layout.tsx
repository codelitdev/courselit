import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { Metadata, ResolvingMetadata } from "next";
import { getAddressFromHeaders, getFullSiteSetup } from "@ui-lib/utils";
import { headers } from "next/headers";
import { FetchBuilder } from "@courselit/utils";
import { notFound } from "next/navigation";
import LayoutWithSidebar from "./layout-with-sidebar";
import { getProduct } from "./helpers";

export async function generateMetadata(
    { params }: { params: { slug: string; id: string } },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const address = getAddressFromHeaders(headers);
    const siteInfo = await getFullSiteSetup(address);

    if (!siteInfo) {
        return {
            title: `${(await parent)?.title?.absolute}`,
        };
    }

    try {
        const query = `
            query ($id: String!) {
                course: getCourse(id: $id) {
                    title
                }
            }
        `
        const fetch = new FetchBuilder()
            .setUrl(`${address}/api/graph`)
            .setPayload({
                query,
                variables: { id: params.id }
            })
            .setIsGraphQLEndpoint(true)
            .build();
        const response = await fetch.exec();
        const course = response.course;

        return {
            title: `${course?.title} | ${(await parent)?.title?.absolute}`,
        };
    } catch (error) {
        notFound();
    }
}

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { slug: string; id: string };
}) {
    const { id } = params;
    const session = await auth();
    const address = getAddressFromHeaders(headers);
    const product = await getProduct(id, address);

    return (
        <SessionProvider session={session}>
            <LayoutWithSidebar product={product}>
                {children}
            </LayoutWithSidebar>
        </SessionProvider>
    );
}

