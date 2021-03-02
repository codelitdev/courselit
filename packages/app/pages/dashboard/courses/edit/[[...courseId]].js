import { useRouter } from "next/router";
import BaseLayout from "../../../../components/Admin/BaseLayout";
import CourseEditor from "../../../../components/Admin/Courses/CourseEditor";
import { NEW_COURSE_PAGE_HEADING } from "../../../../config/strings";

export default function EditCourse() {
  const router = useRouter();
  const { courseId } = router.query;

  return (
    <BaseLayout title={NEW_COURSE_PAGE_HEADING}>
      <CourseEditor courseId={courseId} />
    </BaseLayout>
  );
}
