import dynamic from "next/dynamic";
import { USERS_MANAGER_PAGE_HEADING } from "../../ui-config/strings";

const BaseLayout = dynamic(() => import("../../components/admin/base-layout"));
const Menus = dynamic(() => import("../../components/admin/menus"));

export default function SiteUsers() {
  return (
    <BaseLayout title={USERS_MANAGER_PAGE_HEADING}>
      <Menus />
    </BaseLayout>
  );
}
