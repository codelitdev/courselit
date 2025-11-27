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
    const siteInfo = await getFullSiteSetup(address);

    if (!siteInfo) {
        return null;
    }

    return <HomepageLayout siteInfo={siteInfo}>{children}</HomepageLayout>;
}
