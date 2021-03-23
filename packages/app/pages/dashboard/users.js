import dynamic from "next/dynamic";
import { USERS_MANAGER_PAGE_HEADING } from "../../config/strings";

const BaseLayout = dynamic(() => import("../../components/Admin/BaseLayout"));
const Users = dynamic(() => import("../../components/Admin/Users"));

export default function SiteUsers() {
  return (
    <BaseLayout title={USERS_MANAGER_PAGE_HEADING}>
      <Users />
    </BaseLayout>
  );
}
