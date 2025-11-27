import { Metadata, ResolvingMetadata } from "next";
import { getFullSiteSetup } from "@ui-lib/utils";
import { headers } from "next/headers";
import { FetchBuilder } from "@courselit/utils";
import { notFound } from "next/navigation";
import LayoutWithSidebar from "./layout-with-sidebar";
import { getProduct } from "./helpers";
import { getAddressFromHeaders } from "@/app/actions";

export async function generateMetadata(
    props: { params: Promise<{ slug: string; id: string }> },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const params = await props.params;
    const address = await getAddressFromHeaders(headers);
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
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address}/api/graph`)
            .setPayload({
                query,
                variables: { id: params.id },
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

export default async function Layout(props: {
    children: React.ReactNode;
    params: Promise<{ slug: string; id: string }>;
}) {
    const params = await props.params;

    const { children } = props;

    const { id } = params;
    const address = await getAddressFromHeaders(headers);
    const product = await getProduct(id, address);

    return <LayoutWithSidebar product={product}>{children}</LayoutWithSidebar>;
}
