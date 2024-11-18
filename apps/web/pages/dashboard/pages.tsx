import dynamic from "next/dynamic";
import { MANAGE_PAGES_PAGE_HEADING } from "../../ui-config/strings";

const BaseLayout = dynamic(() => import("../../components/admin/base-layout"));
const Pages = dynamic(() => import("../../components/admin/pages"));

export default function AllPages() {
    return (
        <BaseLayout title={MANAGE_PAGES_PAGE_HEADING}>
            <Pages prefix="/dashboard" />
        </BaseLayout>
    );
}
