import BaseLayout from "@components/admin/base-layout";
import { MANAGE_COURSES_PAGE_HEADING } from "@ui-config/strings";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const ProductEditorLayout = dynamic(
    () => import("../../../../components/admin/products/editor/layout"),
);
const PublishEditor = dynamic(
    () => import("../../../../components/admin/products/editor/publish"),
);

export default function Pricing() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
            <ProductEditorLayout id={id as string} prefix="dashboard">
                <PublishEditor id={id as string} />
            </ProductEditorLayout>
        </BaseLayout>
    );
}
