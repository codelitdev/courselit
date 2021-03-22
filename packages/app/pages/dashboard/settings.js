import dynamic from "next/dynamic";
import { SITE_SETTINGS_PAGE_HEADING } from "../../config/strings";

const BaseLayout = dynamic(() => import("../../components/Admin/BaseLayout"));
const Settings = dynamic(() => import("../../components/Admin/Settings"));

export default function SiteUsers() {
  return (
    <BaseLayout title={SITE_SETTINGS_PAGE_HEADING}>
      <Settings />
    </BaseLayout>
  );
}
