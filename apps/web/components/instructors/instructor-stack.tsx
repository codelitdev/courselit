import type { Instructor } from "@courselit/common-models";
import { INSTRUCTORS_VIEWER_HEADING } from "@ui-config/strings";
import InstructorAvatar from "./instructor-avatar";
import { joinInstructorNames } from "./helpers";

const MAX_VISIBLE = 2;

export default function InstructorStack({
    instructors,
}: {
    instructors: Instructor[];
}) {
    if (!instructors.length) {
        return null;
    }

    const visible = instructors.slice(0, MAX_VISIBLE);
    const extra = instructors.length - visible.length;
    const names = joinInstructorNames(instructors);

    return (
        <span
            className="flex shrink-0 items-center -space-x-2"
            aria-label={`${INSTRUCTORS_VIEWER_HEADING}: ${names}`}
            title={names}
        >
            {visible.map((instructor) => (
                <InstructorAvatar
                    key={instructor.instructorId}
                    instructor={instructor}
                    className="h-6 w-6 border-2 border-background text-[10px]"
                />
            ))}
            {extra > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                    +{extra}
                </span>
            )}
        </span>
    );
}
