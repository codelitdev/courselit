import { CourseViewerRoute } from "@/components/course-viewer-route";

/**
 * The course viewer lives in the layout so it stays mounted while a learner
 * moves between the course and its lessons: switching lessons only changes
 * the lesson shown, without reloading the course or flashing a loader.
 */
export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CourseViewerRoute />
      {children}
    </>
  );
}
