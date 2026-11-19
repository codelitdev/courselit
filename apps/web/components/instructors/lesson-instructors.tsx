import type { Instructor } from "@courselit/common-models";
import { LESSON_INSTRUCTOR_PREFIX } from "@ui-config/strings";
import { joinInstructorNames } from "./helpers";

export default function LessonInstructors({
    instructors,
}: {
    instructors: Instructor[];
}) {
    if (!instructors.length) {
        return null;
    }

    return (
        <p className="text-sm text-muted-foreground">
            {LESSON_INSTRUCTOR_PREFIX} {joinInstructorNames(instructors)}
        </p>
    );
}
