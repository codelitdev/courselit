import "remirror/styles/all.css";
import "@courselit/common-widgets/styles.css";
import "@courselit/components-library/styles.css";
import "../styles/globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getBackendAddress } from "@ui-lib/utils";
import { FetchBuilder } from "@courselit/utils";
import { SiteInfo } from "@courselit/common-models";
import { SITE_SETTINGS_DEFAULT_TITLE } from "@ui-config/strings";

export async function generateMetadata(): Promise<Metadata> {
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
    let siteInfo: SiteInfo = {};
    if (siteInfoResponse.site.settings) {
        siteInfo = siteInfoResponse.site.settings;
    }
    return {
        title: `${siteInfo.title || SITE_SETTINGS_DEFAULT_TITLE}`,
        openGraph: {
            images: [
                siteInfo.logo?.file as any,
                "/courselit_backdrop_square.webp",
            ],
        },
    };
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
