import dynamic from "next/dynamic";
import { SITE_SETTINGS_PAGE_HEADING } from "../../ui-config/strings";

const BaseLayout = dynamic(() => import("../../components/admin2/base-layout"));
const Settings = dynamic(() => import("../../components/admin2/settings"));

export default function SiteUsers() {
  return (
    <BaseLayout title={SITE_SETTINGS_PAGE_HEADING}>
      <Settings />
    </BaseLayout>
  );
}
