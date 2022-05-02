import dynamic from "next/dynamic";
import { USERS_MANAGER_PAGE_HEADING } from "../../ui-config/strings";

const BaseLayout = dynamic(() => import("../../components/admin2/base-layout"));
const Menus = dynamic(() => import("../../components/admin2/menus"));

export default function SiteUsers() {
  return (
    <BaseLayout title={USERS_MANAGER_PAGE_HEADING}>
      <Menus />
    </BaseLayout>
  );
}
