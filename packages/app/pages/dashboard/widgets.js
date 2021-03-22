import BaseLayout from "../../components/Admin/BaseLayout";
import Widgets from "../../components/Admin/Widgets";
import { WIDGETS_PAGE_HEADER } from "../../config/strings";

export default function WidgetsArea() {
  return (
    <BaseLayout title={WIDGETS_PAGE_HEADER}>
      <Widgets />
    </BaseLayout>
  );
}
