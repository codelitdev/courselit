import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const ProductEditorLayout = dynamic(
    () => import("../../../../components/admin/products/editor/layout")
);
const PublishEditor = dynamic(
    () => import("../../../../components/admin/products/editor/publish")
);

export default function Pricing() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <ProductEditorLayout>
            <PublishEditor id={id as string} />
        </ProductEditorLayout>
    );
}
