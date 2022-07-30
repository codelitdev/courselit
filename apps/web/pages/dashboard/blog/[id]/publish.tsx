import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const BlogEditorLayout = dynamic(
    () => import("../../../../components/admin/blogs/editor/layout")
);
const PublishEditor = dynamic(
    () => import("../../../../components/admin/blogs/editor/publish")
);

export default function Pricing() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BlogEditorLayout>
            <PublishEditor id={id as string} />
        </BlogEditorLayout>
    );
}
