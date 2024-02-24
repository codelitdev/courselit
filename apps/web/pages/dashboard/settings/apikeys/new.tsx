import dynamic from "next/dynamic";
import { SITE_SETTINGS_PAGE_HEADING } from "../../../../ui-config/strings";

const BaseLayout = dynamic(
    () => import("../../../../components/admin/base-layout"),
);
const ApikeyNew = dynamic(
    () => import("../../../../components/admin/settings/apikey/new"),
);

export default function SiteUsers() {
    return (
        <BaseLayout title={SITE_SETTINGS_PAGE_HEADING}>
            <ApikeyNew />
        </BaseLayout>
    );
}
