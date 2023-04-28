import dynamic from "next/dynamic";
import { PAGE_HEADER_ALL_MAILS } from "../../../ui-config/strings";

const Mails = dynamic(() => import("../../../components/admin/mails"));
const BaseLayout = dynamic(
    () => import("../../../components/admin/base-layout")
);

export default function EditPage({}) {
    return (
        <BaseLayout title={PAGE_HEADER_ALL_MAILS}>
            <Mails />
        </BaseLayout>
    );
}
