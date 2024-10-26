import dynamic from "next/dynamic";
import { MANAGE_COURSES_PAGE_HEADING } from "../../ui-config/strings";

const BaseLayout = dynamic(() => import("../../components/admin/base-layout"));
const Blogs = dynamic(() => import("../../components/admin/blogs"));

export default function CreatorCourses() {
    return (
        <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
            <Blogs prefix="/dashboard" />
        </BaseLayout>
    );
}
