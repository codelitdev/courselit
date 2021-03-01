import BaseLayout from "../../../components/Admin/BaseLayout";
import Courses from "../../../components/Admin/Courses";
import { MANAGE_COURSES_PAGE_HEADING } from "../../../config/strings";

export default function CreatorCourses() {
  return (
    <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
      <Courses />
    </BaseLayout>
  );
}
