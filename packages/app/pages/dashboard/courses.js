import dynamic from "next/dynamic";
import { MANAGE_COURSES_PAGE_HEADING } from "../../config/strings";

const BaseLayout = dynamic(() => import("../../components/Admin/BaseLayout"));
const Courses = dynamic(() => import("../../components/Admin/Courses"));

export default function CreatorCourses() {
  return (
    <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
      <Courses />
    </BaseLayout>
  );
}
