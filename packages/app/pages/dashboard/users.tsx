import dynamic from "next/dynamic";
import { USERS_MANAGER_PAGE_HEADING } from "../../ui-config/strings";

const BaseLayout = dynamic(() => import("../../components/Admin/base-layout"));
const Users = dynamic(() => import("../../components/Admin/users"));

export default function SiteUsers() {
  return (
    <BaseLayout title={USERS_MANAGER_PAGE_HEADING}>
      <Users />
    </BaseLayout>
  );
}
