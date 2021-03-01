import BaseLayout from "../../components/Admin/BaseLayout";
import Settings from "../../components/Admin/Settings";
import { SITE_SETTINGS_PAGE_HEADING } from "../../config/strings";

export default function SiteUsers() {
  return (
    <BaseLayout title={SITE_SETTINGS_PAGE_HEADING}>
      <Settings />
    </BaseLayout>
  );
}
