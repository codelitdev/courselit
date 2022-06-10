import dynamic from "next/dynamic";
import { HEADER_DESIGN } from "../../ui-config/strings";

const BaseLayout = dynamic(() => import("../../components/admin/base-layout"));
const Design = dynamic(() => import("../../components/admin/design"));

export default function Designer() {
    return (
        <BaseLayout title={HEADER_DESIGN}>
            <Design />
        </BaseLayout>
    );
}
