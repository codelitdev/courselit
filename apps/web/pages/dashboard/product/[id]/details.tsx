import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const ProductEditorLayout = dynamic(
    () => import("../../../../components/admin/products/editor/layout")
);
const DetailsEditor = dynamic(
    () => import("../../../../components/admin/products/editor/details")
);

export default function Pricing() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <ProductEditorLayout>
            <DetailsEditor id={id as string} />
        </ProductEditorLayout>
    );
}
