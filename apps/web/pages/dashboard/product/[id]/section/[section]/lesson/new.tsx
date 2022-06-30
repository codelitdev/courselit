import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { BUTTON_NEW_LESSON_TEXT } from "../../../../../../../ui-config/strings";

const BaseLayout = dynamic(
    () => import("../../../../../../../components/admin/base-layout")
);
const LessonEditor = dynamic(
    () => import("../../../../../../../components/admin/products/lesson-editor")
);

function NewLesson({}) {
    const router = useRouter();
    const { id, section } = router.query;

    return <BaseLayout title={BUTTON_NEW_LESSON_TEXT}>{id}</BaseLayout>;
}

export default NewLesson;
