import { getAuth } from "@/lib/auth";
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
    const domain = (await headers()).get("domain");
    const auth = await getAuth(domain || undefined);
    const [siteInfo, session] = await Promise.all([
        getFullSiteSetup(address),
        auth.api.getSession({
            headers: await headers(),
        }),
    ]);

    if (!siteInfo) {
        return null;
    }

    return <HomepageLayout siteInfo={siteInfo}>{children}</HomepageLayout>;
}
