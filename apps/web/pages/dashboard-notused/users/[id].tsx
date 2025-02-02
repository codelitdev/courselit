import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { USERS_MANAGER_PAGE_HEADING } from "../../../ui-config/strings";

const BaseLayout = dynamic(
    () => import("../../../components/admin/base-layout"),
);
const UserDetails = dynamic(
    () => import("../../../components/admin/users/details"),
);

export default function SiteUsers() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BaseLayout title={USERS_MANAGER_PAGE_HEADING}>
            <UserDetails userId={id} />
        </BaseLayout>
    );
}
