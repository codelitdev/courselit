import dynamic from "next/dynamic";
import { USERS_MANAGER_PAGE_HEADING } from "../../config/strings";

const BaseLayout = dynamic(() => import("../../components/Admin/BaseLayout"));
const Navigation = dynamic(() => import("../../components/Admin/Navigation"));

export default function SiteUsers() {
  return (
    <BaseLayout title={USERS_MANAGER_PAGE_HEADING}>
      <Navigation />
    </BaseLayout>
  );
}
