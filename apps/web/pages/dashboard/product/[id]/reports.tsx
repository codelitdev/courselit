import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ProductEditorLayoutProps } from "../../../../components/admin/products/editor/layout";
import { MANAGE_COURSES_PAGE_HEADING } from "@ui-config/strings";
import BaseLayout from "@components/admin/base-layout";

const ProductEditorLayout = dynamic<ProductEditorLayoutProps>(
    () => import("../../../../components/admin/products/editor/layout"),
);
const CourseReports = dynamic(
    () => import("../../../../components/admin/products/editor/reports"),
);

export default function Reports() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
            <ProductEditorLayout id={id} prefix="dashboard">
                <CourseReports id={id as string} />
            </ProductEditorLayout>
        </BaseLayout>
    );
}
