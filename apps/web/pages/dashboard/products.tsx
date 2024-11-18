import dynamic from "next/dynamic";
import { MANAGE_COURSES_PAGE_HEADING } from "../../ui-config/strings";

const BaseLayout = dynamic(() => import("../../components/admin/base-layout"));
const Products = dynamic(() => import("../../components/admin/products"));

export default function CreatorCourses() {
    return (
        <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
            <Products prefix="/dashboard" />
        </BaseLayout>
    );
}
