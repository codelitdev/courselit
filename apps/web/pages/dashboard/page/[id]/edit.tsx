import { useRouter } from "next/router";
import React from "react";
import PageEditor from "../../../../components/admin/page-editor";

interface EditPageProps {}

export default function EditPage({}: EditPageProps) {
    const router = useRouter();
    const { id } = router.query;

    return <PageEditor id={id as string} />;
}
