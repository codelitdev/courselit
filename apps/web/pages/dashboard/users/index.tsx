import dynamic from "next/dynamic";
import { USERS_MANAGER_PAGE_HEADING } from "../../../ui-config/strings";

const BaseLayout = dynamic(
    () => import("../../../components/admin/base-layout"),
);
const Users = dynamic(() => import("../../../components/admin/users"));

export default function SiteUsers() {
    return (
        <BaseLayout title={USERS_MANAGER_PAGE_HEADING}>
            <Users />
        </BaseLayout>
    );
}
