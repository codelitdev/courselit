import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { MANAGE_COURSES_PAGE_HEADING } from "../../../../ui-config/strings";

const BaseLayout = dynamic(
    () => import("../../../../components/admin/base-layout")
);
const CourseEditor = dynamic(
    () => import("../../../../components/admin/courses/course-editor")
);

export default function CreatorCourses() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
            <CourseEditor courseId={id && id[0]} />
        </BaseLayout>
    );
}
