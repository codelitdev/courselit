import dynamic from "next/dynamic";
import { HEADER_DESIGN } from "../../ui-config/strings";

const BaseLayout = dynamic(() => import("../../components/Admin/BaseLayout"));
const Design = dynamic(() => import("../../components/Admin/design"));

export default function Designer() {
  return (
    <BaseLayout title={HEADER_DESIGN}>
      <Design />
    </BaseLayout>
  );
}
