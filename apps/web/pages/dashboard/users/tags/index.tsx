import { USERS_TAG_HEADER } from "@ui-config/strings";
import dynamic from "next/dynamic";

const BaseLayout = dynamic(() => import("@components/admin/base-layout"));
const Tags = dynamic(() => import("@components/admin/users/tags"));

export default function TagsIndex() {
    return (
        <BaseLayout title={USERS_TAG_HEADER}>
            <Tags />
        </BaseLayout>
    );
}
