import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import HomepageLayout from "./home-page-layout";
import { headers } from "next/headers";
import { getAddressFromHeaders, getFullSiteSetup } from "@ui-lib/utils";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const address = getAddressFromHeaders(headers);
    const [siteInfo, session] = await Promise.all([
        getFullSiteSetup(address),
        auth(),
    ]);

    if (!siteInfo) {
        return null;
    }

    return (
        <SessionProvider session={session}>
            <HomepageLayout siteInfo={siteInfo}>{children}</HomepageLayout>
        </SessionProvider>
    );
}
