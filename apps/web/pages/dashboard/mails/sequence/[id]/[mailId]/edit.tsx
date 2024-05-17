import { useRouter } from "next/router";
import React from "react";
import { PAGE_HEADER_EDIT_SEQUENCE } from "@ui-config/strings";
import dynamic from "next/dynamic";

const MailEditor = dynamic(
    () => import("@components/admin/mails/sequence-mail-editor"),
);
const BaseLayout = dynamic(() => import("@components/admin/base-layout"));

export default function EditPage({}) {
    const router = useRouter();
    const { id, mailId } = router.query;
    return (
        <BaseLayout title={PAGE_HEADER_EDIT_SEQUENCE}>
            <MailEditor sequenceId={id as string} mailId={mailId as string} />
        </BaseLayout>
    );
}
