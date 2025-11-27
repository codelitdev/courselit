import { SessionProvider } from "next-auth/react";
import HomepageLayout from "./home-page-layout";
import { headers } from "next/headers";
import { getFullSiteSetup } from "@ui-lib/utils";
import { getAddressFromHeaders } from "@/app/actions";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const address = await getAddressFromHeaders(headers);
    const [siteInfo, session] = await Promise.all([
        getFullSiteSetup(address),
        // auth(),
        null,
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
