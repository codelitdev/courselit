import LayoutWithContext from "./layout-with-context";
import React from "react";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getAddressFromHeaders, getFullSiteSetup } from "@ui-lib/utils";
import { defaultState } from "@components/default-state";
import { decode } from "base-64";
import { ServerConfig, SiteInfo } from "@courselit/common-models";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const address = getAddressFromHeaders(headers);
    const session = await auth();

    const siteSetup = await getFullSiteSetup(address);
    const config: ServerConfig = {
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
        queueServer: process.env.QUEUE_SERVER || "",
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
    };

    return (
        <LayoutWithContext
            address={address}
            siteinfo={formatSiteInfo(siteSetup?.settings)}
            theme={siteSetup?.theme || defaultState.theme}
            config={config}
            session={session}
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
    lemonsqueezyKey:
        siteinfo?.lemonsqueezyKey || defaultState.siteinfo.lemonsqueezyKey,
});
