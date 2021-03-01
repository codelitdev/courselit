import BaseLayout from "../../components/Admin/BaseLayout";
import Users from "../../components/Admin/Users";
import { USERS_MANAGER_PAGE_HEADING } from "../../config/strings";

export default function SiteUsers() {
  return (
    <BaseLayout title={USERS_MANAGER_PAGE_HEADING}>
      <Users />
    </BaseLayout>
  );
}
