import BaseLayout from "../../components/Admin/BaseLayout";
import MediaManager from "../../components/Admin/Media/MediaManager";
import { MEDIA_MANAGER_PAGE_HEADING } from "../../config/strings";

export default function Media() {
  return (
    <BaseLayout title={MEDIA_MANAGER_PAGE_HEADING}>
      <MediaManager />
    </BaseLayout>
  );
}
