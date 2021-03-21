import BaseLayout from "../../components/Admin/BaseLayout";
import AdminMedia from "../../components/Admin/Media";
import { MEDIA_MANAGER_PAGE_HEADING } from "../../config/strings";

export default function Media() {
  return (
    <BaseLayout title={MEDIA_MANAGER_PAGE_HEADING}>
      <AdminMedia />
    </BaseLayout>
  );
}
