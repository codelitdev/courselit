import React from "react";
import {
    COURSE_TYPE_COURSE,
    COURSE_TYPE_DOWNLOAD,
} from "../../../../../ui-config/constants";
import useCourse from "../course-hook";
import LessonsList from "./lessons-list";

interface EditorProps {
    id: string;
}

export default function Content({ id }: EditorProps) {
    const course = useCourse(id);

    return (
        <div className="flex flex-col gap-4">
            {course && (
                <>
                    {[COURSE_TYPE_COURSE, COURSE_TYPE_DOWNLOAD].includes(
                        course!.type!.toLowerCase(),
                    ) && <LessonsList id={id} />}
                </>
            )}
        </div>
    );
}
