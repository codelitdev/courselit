import LayoutWithContext from "./layout-with-context";
import React from "react";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getFullSiteSetup } from "@ui-lib/utils";
import { getAddressFromHeaders } from "@/app/actions";
import { defaultState } from "@components/default-state";
import { decode } from "base-64";
import { ServerConfig, SiteInfo } from "@courselit/common-models";
import constants from "@config/constants";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const address = await getAddressFromHeaders(headers);
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const siteSetup = await getFullSiteSetup(address);
    const config: ServerConfig = {
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
        queueServer: process.env.QUEUE_SERVER || "",
        cacheEnabled: constants.cacheEnabled,
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
    };

    return (
        <LayoutWithContext
            address={address}
            siteinfo={formatSiteInfo(siteSetup?.settings)}
            theme={siteSetup?.theme || defaultState.theme}
            config={config}
            session={session}
            features={siteSetup?.features || defaultState.features}
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
    logins: siteinfo?.logins || defaultState.siteinfo.logins,
});
