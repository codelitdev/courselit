import BaseLayout from "@components/admin/base-layout";
import Tags from "@components/admin/users/tags";
import { USERS_TAG_HEADER } from "../../../ui-config/strings";

export default function SiteUsers() {
    return (
        <BaseLayout title={USERS_TAG_HEADER}>
            <Tags />
        </BaseLayout>
    );
}
