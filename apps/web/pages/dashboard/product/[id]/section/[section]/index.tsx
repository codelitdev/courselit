import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { EDIT_SECTION_HEADER } from "../../../../../../ui-config/strings";

const BaseLayout = dynamic(
    () => import("../../../../../../components/admin/base-layout")
);

const SectionEditor = dynamic(
    () => import("../../../../../../components/admin/products/editor/section")
);

function EditSection({}) {
    const router = useRouter();
    const { id, section } = router.query;

    return (
        <BaseLayout title={EDIT_SECTION_HEADER}>
            <SectionEditor id={id as string} section={section as string} />
        </BaseLayout>
    );
}

export default EditSection;
