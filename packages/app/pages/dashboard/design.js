import BaseLayout from "../../components/Admin/BaseLayout";
import Design from "../../components/Admin/Design";
import { HEADER_DESIGN } from "../../config/strings";

export default function Designer() {
  return (
    <BaseLayout title={HEADER_DESIGN}>
      <Design />
    </BaseLayout>
  );
}
