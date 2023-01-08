import dynamic from "next/dynamic";
import { useRouter } from "next/router";
const ProductEditorLayout = dynamic(
    () => import("../../../../components/admin/products/editor/layout")
);

const ContentEditor = dynamic(
    () => import("../../../../components/admin/products/editor/content")
);

export default function Content() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <ProductEditorLayout>
            <ContentEditor id={id as string} />
        </ProductEditorLayout>
    );
}
