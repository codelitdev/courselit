import LayoutWithContext from "./layout-with-context";
import React from "react";
import { auth } from "@/auth";
import { FetchBuilder } from "@courselit/utils";
import { headers } from "next/headers";
import { getBackendAddress } from "@ui-lib/utils";
import { defaultState } from "@components/default-state";
import { decode } from "base-64";
import { SiteInfo } from "@courselit/common-models";
import { redirect } from "next/navigation";
// import "../../styles/globals.css";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session) {
        redirect("/login");
    }
    const headersList = headers();
    const address = getBackendAddress({
        "x-forwarded-proto": headersList.get("x-forwarded-proto"),
        host: headersList.get("host"),
    });

    const siteInfoQuery = `
            { site: getSiteInfo {
                    name,
                    settings {
                        title,
                        subtitle,
                        logo {
                            file,
                            caption
                        },
                        currencyISOCode,
                        paymentMethod,
                        stripeKey,
                        codeInjectionHead,
                        codeInjectionBody,
                        mailingAddress,
                        hideCourseLitBranding,
                        razorpayKey,
                    },
                    theme {
                        name,
                        active,
                        styles,
                        url
                    },
                    typefaces {
                        section,
                        typeface,
                        fontWeights
                    },
                }
            }
            `;
    const siteInfoFetch = new FetchBuilder()
        .setUrl(`${address}/api/graph`)
        .setPayload(siteInfoQuery)
        .setIsGraphQLEndpoint(true)
        .build();
    const siteInfoResponse = await siteInfoFetch.exec();
    const config = {
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
    };

    return (
        <LayoutWithContext
            session={session}
            address={address}
            siteinfo={formatSiteInfo(siteInfoResponse.site.settings)}
            typefaces={siteInfoResponse.site.typefaces}
            config={config}
        >
            {children}
        </LayoutWithContext>
    );
}

const formatSiteInfo = (siteinfo?: SiteInfo) => ({
    title: siteinfo?.title || defaultState.siteinfo.title,
    subtitle: siteinfo?.subtitle || defaultState.siteinfo.subtitle,
    logo: siteinfo?.logo || defaultState.siteinfo.logo,
    currencyISOCode:
        siteinfo?.currencyISOCode || defaultState.siteinfo.currencyISOCode,
    paymentMethod:
        siteinfo?.paymentMethod || defaultState.siteinfo.paymentMethod,
    stripeKey: siteinfo?.stripeKey || defaultState.siteinfo.stripeKey,
    codeInjectionHead: siteinfo?.codeInjectionHead
        ? decode(siteinfo.codeInjectionHead)
        : defaultState.siteinfo.codeInjectionHead,
    codeInjectionBody: siteinfo?.codeInjectionBody
        ? decode(siteinfo.codeInjectionBody)
        : defaultState.siteinfo.codeInjectionBody,
    mailingAddress:
        siteinfo?.mailingAddress || defaultState.siteinfo.mailingAddress,
    hideCourseLitBranding:
        siteinfo?.hideCourseLitBranding ||
        defaultState.siteinfo.hideCourseLitBranding,
    razorpayKey: siteinfo?.razorpayKey || defaultState.siteinfo.razorpayKey,
});
