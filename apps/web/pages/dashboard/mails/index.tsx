import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { PAGE_HEADER_ALL_MAILS } from "../../../ui-config/strings";

const Mails = dynamic(() => import("../../../components/admin/mails"));
const BaseLayout = dynamic(
    () => import("../../../components/admin/base-layout")
);

export default function EditPage({}) {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BaseLayout title={PAGE_HEADER_ALL_MAILS}>
            <Mails />
        </BaseLayout>
    );
}
