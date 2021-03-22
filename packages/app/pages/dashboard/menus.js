import dynamic from "next/dynamic";
import { USERS_MANAGER_PAGE_HEADING } from "../../config/strings";

const BaseLayout = dynamic(() => import("../../components/Admin/BaseLayout"));
const Menus = dynamic(() => import("../../components/Admin/Menus"));

export default function SiteUsers() {
  return (
    <BaseLayout title={USERS_MANAGER_PAGE_HEADING}>
      <Menus />
    </BaseLayout>
  );
}
