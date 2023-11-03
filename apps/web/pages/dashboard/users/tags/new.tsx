import { USERS_TAG_NEW_HEADER } from "@ui-config/strings";
import dynamic from "next/dynamic";

const BaseLayout = dynamic(() => import("@components/admin/base-layout"));
const NewTag = dynamic(() => import("@components/admin/users/tags/new"));

export default function TagsIndex() {
    return (
        <BaseLayout title={USERS_TAG_NEW_HEADER}>
            <NewTag />
        </BaseLayout>
    );
}
