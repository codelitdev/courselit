import dynamic from "next/dynamic";
import { WIDGETS_PAGE_HEADER } from "../../ui-config/strings";

const BaseLayout = dynamic(() => import("../../components/admin2/base-layout"));
const Widgets = dynamic(() => import("../../components/admin2/widgets"));

export default function WidgetsArea() {
  return (
    <BaseLayout title={WIDGETS_PAGE_HEADER}>
      <Widgets />
    </BaseLayout>
  );
}
