import "remirror/styles/all.css";
import "@courselit/page-blocks/styles.css";
import "@courselit/components-library/styles.css";
import "@courselit/page-primitives/styles.css";
import "../styles/globals.css";
import Script from "next/script";
import type { Metadata } from "next";
import { headers } from "next/headers";
import {
    getAddressFromHeaders,
    getSiteInfo,
    getFullSiteSetup,
} from "@ui-lib/utils";
import * as fonts from "@/lib/fonts";
import { generateThemeStyles } from "@/lib/theme-styles";
import { Inter } from "next/font/google";
import { SITE_SETTINGS_DEFAULT_TITLE } from "@ui-config/strings";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
    const address = getAddressFromHeaders(headers);
    const siteInfo = await getSiteInfo(address);

    return {
        title: `${siteInfo?.title || SITE_SETTINGS_DEFAULT_TITLE}`,
        description: siteInfo?.subtitle || "",
        openGraph: {
            title: `${siteInfo?.title || SITE_SETTINGS_DEFAULT_TITLE}`,
            description: siteInfo?.subtitle || "",
            images: [
                {
                    url: siteInfo?.logo?.file as any,
                    alt: siteInfo?.logo?.caption || "",
                },
            ],
        },
        twitter: {
            title: `${siteInfo?.title || SITE_SETTINGS_DEFAULT_TITLE}`,
            description: siteInfo?.subtitle || "",
            images: [
                {
                    url: siteInfo?.logo?.file as any,
                    alt: siteInfo?.logo?.caption || "",
                },
            ],
        },
        generator: "CourseLit",
        applicationName: "CourseLit",
    };
}

interface RootLayoutProps {
    children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
    const address = getAddressFromHeaders(headers);
    const siteSetup = await getFullSiteSetup(address);
    const themeStyles = siteSetup?.theme
        ? generateThemeStyles(siteSetup.theme)
        : "";

    return (
        <html lang="en">
            <head>
                <style>{themeStyles}</style>
            </head>
            <body
                className={`${fonts.openSans.variable} ${fonts.montserrat.variable} ${fonts.lato.variable} ${fonts.poppins.variable} ${fonts.sourceSans3.variable} ${fonts.raleway.variable} ${fonts.notoSans.variable} ${fonts.merriweather.variable} ${fonts.inter.variable} ${fonts.alegreya.variable} ${fonts.roboto.variable} ${fonts.mulish.variable} ${fonts.nunito.variable} ${fonts.rubik.variable} ${fonts.playfairDisplay.variable} ${fonts.oswald.variable} ${fonts.ptSans.variable} ${fonts.workSans.variable} ${fonts.robotoSlab.variable} ${fonts.sourceSerif4.variable} ${fonts.bebasNeue.variable} ${fonts.quicksand.variable} font-sans ${inter.className}`}
            >
                {children}
                {/* Conditionally load the Google reCAPTCHA v3 script. Only loads if the site key is set in environment variables. */}
                {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
                    <Script
                        src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
                        strategy="afterInteractive" // Load after the page becomes interactive to avoid blocking initial render.
                    />
                )}
            </body>
        </html>
    );
}
