import { Metadata, ResolvingMetadata } from "next";
import { getFullSiteSetup } from "@ui-lib/utils";
import { headers } from "next/headers";
import { FetchBuilder } from "@courselit/utils";
import { notFound } from "next/navigation";
import LayoutWithSidebar from "./layout-with-sidebar";
import { getProduct } from "./helpers";
import { getAddressFromHeaders } from "@/app/actions";
import {
    COURSE_VIEWER_CURRENT_URL_HEADER,
    getCourseViewerSessionParamsFromUrl,
} from "@/lib/course-viewer-session-params";

export async function generateMetadata(
    props: { params: Promise<{ slug: string; id: string }> },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const params = await props.params;
    const requestHeaders = await headers();
    const viewerSessionParams = getCourseViewerSessionParamsFromUrl(
        requestHeaders.get(COURSE_VIEWER_CURRENT_URL_HEADER),
    );
    const address = await getAddressFromHeaders(headers);
    const siteInfo = await getFullSiteSetup(address);

    if (!siteInfo) {
        return {
            title: `${(await parent)?.title?.absolute}`,
        };
    }

    try {
        const query = `
            query ($id: String!, $preview: Boolean) {
                course: getCourse(id: $id, preview: $preview) {
                    title
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address}/api/graph`)
            .setPayload({
                query,
                variables: {
                    id: params.id,
                    preview: viewerSessionParams.preview,
                },
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
    const viewerSessionParams = getCourseViewerSessionParamsFromUrl(
        requestHeaders.get(COURSE_VIEWER_CURRENT_URL_HEADER),
    );
    const address = await getAddressFromHeaders(headers);
    let product;

    try {
        product = await getProduct(
            id,
            address,
            Boolean(viewerSessionParams.preview),
            {
                cookie: requestHeaders.get("cookie") ?? "",
            },
        );
    } catch (error) {
        notFound();
    }

    return <LayoutWithSidebar product={product}>{children}</LayoutWithSidebar>;
}
