import React, { ReactNode } from "react";
import { auth } from "@/auth";
import Layout from "@components/layout";
import { FetchBuilder } from "@courselit/utils";
import { headers } from "next/headers";
import { getBackendAddress } from "@ui-lib/utils";
import { defaultState } from "@components/default-state";
import { decode } from "base-64";
import { SiteInfo } from "@courselit/common-models";
import { redirect } from "next/navigation";
import "../../styles/globals.css";

interface PageProps {
    children: ReactNode;
}

export default async function Page({ children }: PageProps) {
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
    let finalSiteInfo: SiteInfo = {};
    if (siteInfoResponse.site.settings) {
        const siteinfo = siteInfoResponse.site.settings;
        finalSiteInfo = {
            title: siteinfo.title || defaultState.siteinfo.title,
            subtitle: siteinfo.subtitle || defaultState.siteinfo.subtitle,
            logo: siteinfo.logo || defaultState.siteinfo.logo,
            currencyISOCode:
                siteinfo.currencyISOCode ||
                defaultState.siteinfo.currencyISOCode,
            paymentMethod:
                siteinfo.paymentMethod || defaultState.siteinfo.paymentMethod,
            stripeKey: siteinfo.stripeKey || defaultState.siteinfo.stripeKey,
            codeInjectionHead:
                decode(siteinfo.codeInjectionHead) ||
                defaultState.siteinfo.codeInjectionHead,
            codeInjectionBody:
                decode(siteinfo.codeInjectionBody) ||
                defaultState.siteinfo.codeInjectionBody,
            mailingAddress:
                siteinfo.mailingAddress || defaultState.siteinfo.mailingAddress,
            hideCourseLitBranding:
                siteinfo.hideCourseLitBranding ||
                defaultState.siteinfo.hideCourseLitBranding,
            razorpayKey:
                siteinfo.razorpayKey || defaultState.siteinfo.razorpayKey,
        };
    }

    return (
        <Layout session={session} address={address} siteinfo={finalSiteInfo}>
            <div className="mx-auto lg:max-w-[1200px] w-full">{children}</div>
        </Layout>
    );
}
