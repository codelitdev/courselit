import "remirror/styles/all.css";
import "@courselit/page-blocks/styles.css";
import "@courselit/components-library/styles.css";
import "@courselit/page-primitives/styles.css";
import "../styles/globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getBackendAddress } from "@ui-lib/utils";
import { FetchBuilder } from "@courselit/utils";
import { SiteInfo } from "@courselit/common-models";
import { SITE_SETTINGS_DEFAULT_TITLE } from "@ui-config/strings";
import * as fonts from "@/lib/fonts";

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
                        lemonsqueezyStoreId,
                        lemonsqueezyOneTimeVariantId,
                        lemonsqueezySubscriptionMonthlyVariantId,
                        lemonsqueezySubscriptionYearlyVariantId,
                    },
                    theme {
                        colors,
                        typography,
                        interactives,
                        structure
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
        generator: "CourseLit",
        applicationName: "CourseLit",
    };
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            lang="en"
            className={`${fonts.openSans.variable} ${fonts.montserrat.variable} ${fonts.lato.variable} ${fonts.poppins.variable} ${fonts.sourceSans3.variable} ${fonts.raleway.variable} ${fonts.notoSans.variable} ${fonts.merriweather.variable} ${fonts.inter.variable} ${fonts.alegreya.variable} ${fonts.roboto.variable} ${fonts.mulish.variable} ${fonts.nunito.variable} ${fonts.rubik.variable} ${fonts.playfairDisplay.variable} ${fonts.oswald.variable} ${fonts.ptSans.variable} ${fonts.workSans.variable} ${fonts.robotoSlab.variable} ${fonts.sourceSerif4.variable} ${fonts.bebasNeue.variable} ${fonts.quicksand.variable} font-sans`}
        >
            <body>{children}</body>
        </html>
    );
}
