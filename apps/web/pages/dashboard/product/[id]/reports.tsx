import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ProductEditorLayoutProps } from "../../../../components/admin/products/editor/layout";

const ProductEditorLayout = dynamic<ProductEditorLayoutProps>(
    () => import("../../../../components/admin/products/editor/layout")
);
const CourseReports = dynamic(
    () => import("../../../../components/admin/products/editor/reports")
);

export default function Reports() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <ProductEditorLayout>
            <CourseReports id={id as string} />
        </ProductEditorLayout>
    );
}
