import dynamic from "next/dynamic";
import { PAGE_HEADER_ALL_MAILS } from "../../../ui-config/strings";
import { useRouter } from "next/router";

const Mails = dynamic(() => import("../../../components/admin/mails"));
const BaseLayout = dynamic(
    () => import("../../../components/admin/base-layout"),
);

export default function EditPage({}) {
    const router = useRouter();
    const { tab } = router.query;

    return (
        <BaseLayout title={PAGE_HEADER_ALL_MAILS}>
            <Mails selectedTab={tab} />
        </BaseLayout>
    );
}
