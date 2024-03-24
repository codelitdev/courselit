import dynamic from "next/dynamic";
import { NEW_PAGE_HEADING } from "../../../ui-config/strings";

const BaseLayout = dynamic(
    () => import("../../../components/admin/base-layout"),
);
const NewPage = dynamic(
    () => import("../../../components/admin/pages/new-page"),
);

export default function AllPages() {
    return (
        <BaseLayout title={NEW_PAGE_HEADING}>
            <NewPage />
        </BaseLayout>
    );
}
