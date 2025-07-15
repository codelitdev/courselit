import { getFullSiteSetup, getPage } from "@ui-lib/utils";
import { getAddressFromHeaders } from "@/ui-lib/utils";
import ClientSidePage from "./client-side-page";
import { headers } from "next/headers";
import type { Metadata, ResolvingMetadata } from "next";
import { Media } from "@courselit/common-models";
import { notFound } from "next/navigation";

type Props = {
    params: {
        id: string;
    };
};

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const address = getAddressFromHeaders(headers);
    const [siteInfo, page] = await Promise.all([
        getFullSiteSetup(address),
        getPage(address, params.id),
    ]);
    if (!siteInfo) {
        return {
            title: `${(await parent)?.title?.absolute}`,
        };
    }

    if (!page) {
        return {
            title: "Page not found",
        };
    }

    const title = page?.title || page.pageData?.title || page.name;
    const socialImage: Media | undefined =
        page.socialImage ||
        (page.pageData?.featuredImage as Media) ||
        siteInfo.settings.logo;
    const description = page.description;

    return {
        generator: "CourseLit",
        title: `${title} | ${(await parent)?.title?.absolute}`,
        description,
        openGraph: {
            title: `${title} | ${(await parent)?.title?.absolute}`,
            description,
            images: [
                {
                    url: socialImage?.file || "",
                    alt: socialImage?.caption || "",
                },
            ],
        },
        twitter: {
            title: `${title} | ${(await parent)?.title?.absolute}`,
            description,
            images: [
                {
                    url: socialImage?.file || "",
                    alt: socialImage?.caption || "",
                },
            ],
        },
        robots: {
            index: page.robotsAllowed,
        },
        icons: {
            icon: siteInfo.settings.logo?.file || "/favicon.ico",
        },
    };
}

export default async function Page({ params }: Props) {
    const address = getAddressFromHeaders(headers);
    const [siteInfo, page] = await Promise.all([
        getFullSiteSetup(address),
        getPage(address, params.id),
    ]);
    if (!siteInfo) {
        return null;
    }

    if (!page) {
        return notFound();
    }

    return (
        <ClientSidePage
            page={page}
            siteinfo={siteInfo.settings}
            theme={siteInfo.theme}
        />
    );
}
