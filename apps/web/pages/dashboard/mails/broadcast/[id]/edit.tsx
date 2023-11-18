import { useRouter } from "next/router";
import React from "react";
import { PAGE_HEADER_EDIT_MAIL } from "@ui-config/strings";
import dynamic from "next/dynamic";

const BroadcastEditor = dynamic(
    () => import("@components/admin/mails/broadcast-editor"),
);
const BaseLayout = dynamic(() => import("@components/admin/base-layout"));

export default function EditPage({}) {
    const router = useRouter();
    const { id } = router.query;
    return (
        <BaseLayout title={PAGE_HEADER_EDIT_MAIL}>
            <BroadcastEditor id={id as string} />
        </BaseLayout>
    );
}
