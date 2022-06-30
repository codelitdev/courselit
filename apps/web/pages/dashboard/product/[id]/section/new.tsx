import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { NEW_SECTION_HEADER } from "../../../../../ui-config/strings";

const BaseLayout = dynamic(
    () => import("../../../../../components/admin/base-layout")
);

const SectionEditor = dynamic(
    () => import("../../../../../components/admin/products/editor/section")
);

function NewSection({}) {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BaseLayout title={NEW_SECTION_HEADER}>
            <SectionEditor id={id as string} />
        </BaseLayout>
    );
}

export default NewSection;
