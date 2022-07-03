import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { BUTTON_NEW_LESSON_TEXT } from "../../../../../../../ui-config/strings";

const BaseLayout = dynamic(
    () => import("../../../../../../../components/admin/base-layout")
);
const LessonEditor = dynamic(
    () =>
        import(
            "../../../../../../../components/admin/products/editor/content/lesson"
        )
);

function NewLesson({}) {
    const router = useRouter();
    const { id, section, lesson } = router.query;

    return (
        <BaseLayout title={BUTTON_NEW_LESSON_TEXT}>
            <LessonEditor
                courseId={id as string}
                sectionId={section as string}
                lessonId={lesson as string}
            />
        </BaseLayout>
    );
}

export default NewLesson;
