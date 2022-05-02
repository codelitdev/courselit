import dynamic from "next/dynamic";
import { MEDIA_MANAGER_PAGE_HEADING } from "../../ui-config/strings";

const BaseLayout = dynamic(() => import("../../components/Admin/base-layout"));
const AdminMedia = dynamic(() => import("../../components/Admin/media"));

export default function Media() {
  return (
    <BaseLayout title={MEDIA_MANAGER_PAGE_HEADING}>
      <AdminMedia />
    </BaseLayout>
  );
}
