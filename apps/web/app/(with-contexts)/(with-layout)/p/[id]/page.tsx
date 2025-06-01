import { getFullSiteSetup, getPage } from "@ui-lib/utils";
import { getAddressFromHeaders } from "@/ui-lib/utils";
import ClientSidePage from "./client-side-page";
import { headers } from "next/headers";
import type { Metadata, ResolvingMetadata } from "next";

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
    const siteInfo = await getFullSiteSetup(address);
    if (!siteInfo) {
        return {
            title: `${(await parent)?.title?.absolute}`,
        };
    }

    const page = await getPage(address, params.id);

    const title = page.title || page.pageData?.title || page.name;
    const socialImage = page.socialImage || siteInfo.settings.logo;
    const description =
        page.description || (page.pageData?.description as string);

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
    const siteInfo = await getFullSiteSetup(address);
    if (!siteInfo) {
        return null;
    }

    const page = await getPage(address, params.id);

    return (
        <ClientSidePage
            page={page}
            siteinfo={siteInfo.settings}
            theme={siteInfo.theme}
        />
    );
}
