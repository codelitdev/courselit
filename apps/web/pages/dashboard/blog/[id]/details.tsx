import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const BlogEditorLayout = dynamic(
    () => import("../../../../components/admin/blogs/editor/layout")
);
const DetailsEditor = dynamic(
    () => import("../../../../components/admin/blogs/editor/details")
);

export default function Pricing() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BlogEditorLayout>
            <DetailsEditor id={id as string} />
        </BlogEditorLayout>
    );
}
