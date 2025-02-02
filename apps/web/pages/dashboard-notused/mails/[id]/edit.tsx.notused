import { useRouter } from "next/router";
import React from "react";
import { PAGE_HEADER_EDIT_MAIL } from "../../../../ui-config/strings";
import dynamic from "next/dynamic";

const MailEditor = dynamic(
    () => import("../../../../components/admin/mails/editor.tsx.notused"),
);
const BaseLayout = dynamic(
    () => import("../../../../components/admin/base-layout"),
);

export default function EditPage({}) {
    const router = useRouter();
    const { id } = router.query;
    return (
        <BaseLayout title={PAGE_HEADER_EDIT_MAIL}>
            <MailEditor id={id as string} />
        </BaseLayout>
    );
}
