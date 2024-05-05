import { useRouter } from "next/router";
import React from "react";
import { PAGE_HEADER_EDIT_SEQUENCE } from "@ui-config/strings";
import dynamic from "next/dynamic";

const SequenceEditor = dynamic(
    () => import("@components/admin/mails/sequence-editor"),
);
const BaseLayout = dynamic(() => import("@components/admin/base-layout"));

export default function EditPage({}) {
    const router = useRouter();
    const { id } = router.query;
    return (
        <BaseLayout title={PAGE_HEADER_EDIT_SEQUENCE}>
            <SequenceEditor id={id as string} />
        </BaseLayout>
    );
}
