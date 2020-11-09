import BaseLayout from "../components/Public/BaseLayout";
import { PAGE_HEADER_FEATURED } from "../config/strings";

export default function Featured(props) {
  return (
    <BaseLayout title={PAGE_HEADER_FEATURED}>
      All the featured content will be visible here
    </BaseLayout>
  );
}
