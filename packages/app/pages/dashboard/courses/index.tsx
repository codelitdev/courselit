import dynamic from "next/dynamic";
import { MANAGE_COURSES_PAGE_HEADING } from "../../../ui-config/strings";

const BaseLayout = dynamic(
  () => import("../../../components/Admin/base-layout")
);
const Courses = dynamic(() => import("../../../components/Admin/courses"));

export default function CreatorCourses() {
  return (
    <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
      <Courses />
    </BaseLayout>
  );
}
