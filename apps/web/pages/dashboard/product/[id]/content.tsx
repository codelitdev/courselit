import { Section } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import generateTabs from "../../../../components/admin/products/tabs-data";
import Tabs from "../../../../components/tabs";
import { MANAGE_COURSES_PAGE_HEADING } from "../../../../ui-config/strings";

const BaseLayout = dynamic(
    () => import("../../../../components/admin/base-layout")
);
const ContentEditor = dynamic(
    () => import("../../../../components/admin/products/editor/content")
);

export default function CreatorCourses() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
            <Tabs tabs={generateTabs(id as string)} />
            <ContentEditor id={id as string} />
        </BaseLayout>
    );
}
