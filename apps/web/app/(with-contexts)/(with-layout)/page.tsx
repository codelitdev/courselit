import { getFullSiteSetup } from "@ui-lib/utils";
import { getAddressFromHeaders } from "@/app/actions";
import ClientSidePage from "./p/[id]/client-side-page";
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
    const address = await getAddressFromHeaders(headers);
    const siteInfo = await getFullSiteSetup(address, "homepage");
    if (!siteInfo) {
        return {
            title: "CourseLit",
        };
    }

    const page = siteInfo.page;

    const title = page.title || siteInfo.settings.title;
    const socialImage = page.socialImage || siteInfo.settings.logo;
    const description = page.description || siteInfo.settings.subtitle;

    return {
        generator: "CourseLit",
        title,
        description,
        openGraph: {
            title,
            description,
            images: [
                {
                    url: socialImage?.file || "",
                    alt: socialImage?.caption || "",
                },
            ],
        },
        twitter: {
            title,
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

export default async function Page() {
    const address = await getAddressFromHeaders(headers);
    const siteInfo = await getFullSiteSetup(address, "homepage");
    if (!siteInfo) {
        return null;
    }

    return (
        <ClientSidePage
            page={siteInfo.page}
            siteinfo={siteInfo.settings}
            theme={siteInfo.theme}
        />
    );
}
