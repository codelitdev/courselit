import { getFullSiteSetup } from "@ui-lib/utils";
import { getAddressFromHeaders } from "@/app/actions";
import ClientSidePage from "./p/[id]/client-side-page";
import { headers } from "next/headers";
import type { Metadata } from "next";
import FirstRunPopup from "./first-run-popup";

export async function generateMetadata(): Promise<Metadata> {
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

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ firstrun?: string }>;
}) {
    const address = await getAddressFromHeaders(headers);
    const siteInfo = await getFullSiteSetup(address, "homepage");
    if (!siteInfo) {
        return null;
    }
    const firstRun = (await searchParams).firstrun === "1";

    return (
        <>
            <ClientSidePage
                page={siteInfo.page}
                siteinfo={siteInfo.settings}
                theme={siteInfo.theme}
            />
            {firstRun && <FirstRunPopup />}
        </>
    );
}
