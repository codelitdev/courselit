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
    const requestHeaders = await headers();
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
            .setHeaders({
                cookie: requestHeaders.get("cookie") ?? "",
            })
            .setIsGraphQLEndpoint(true)
            .build();
        const response = await fetch.exec();
        const course = response.course;
        const parentTitle = (await parent)?.title?.absolute;

        if (!course?.title) {
            notFound();
        }

        return {
            title: parentTitle
                ? `${course.title} | ${parentTitle}`
                : course.title,
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
    const requestHeaders = await headers();
    const address = await getAddressFromHeaders(headers);
    let product;

    try {
        product = await getProduct(id, address, {
            cookie: requestHeaders.get("cookie") ?? "",
        });
    } catch (error) {
        notFound();
    }

    return <LayoutWithSidebar product={product}>{children}</LayoutWithSidebar>;
}
