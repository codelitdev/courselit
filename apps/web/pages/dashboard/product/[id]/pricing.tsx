import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const ProductEditorLayout = dynamic(
    () => import("../../../../components/admin/products/editor/layout")
);
const PricingEditor = dynamic(
    () => import("../../../../components/admin/products/editor/pricing")
);

export default function Pricing() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <ProductEditorLayout>
            <PricingEditor id={id as string} />
        </ProductEditorLayout>
    );
}
