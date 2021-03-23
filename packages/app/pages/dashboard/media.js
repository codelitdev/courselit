import dynamic from "next/dynamic";
import { MEDIA_MANAGER_PAGE_HEADING } from "../../config/strings";

const BaseLayout = dynamic(() => import("../../components/Admin/BaseLayout"));
const AdminMedia = dynamic(() => import("../../components/Admin/Media"));

export default function Media() {
  return (
    <BaseLayout title={MEDIA_MANAGER_PAGE_HEADING}>
      <AdminMedia />
    </BaseLayout>
  );
}
