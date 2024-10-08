import React from "react";
import {
    COURSE_TYPE_COURSE,
    COURSE_TYPE_DOWNLOAD,
} from "../../../../../ui-config/constants";
import useCourse from "../course-hook";
import LessonsList from "./lessons-list";
import { Address } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";

interface EditorProps {
    id: string;
    address: Address;
    dispatch?: AppDispatch;
    prefix: string;
}

export default function Content({
    id,
    address,
    dispatch,
    prefix,
}: EditorProps) {
    const course = useCourse(id, address);

    if (!course) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4">
            {[COURSE_TYPE_COURSE, COURSE_TYPE_DOWNLOAD].includes(
                course!.type!.toLowerCase(),
            ) && (
                <LessonsList
                    id={id}
                    address={address}
                    dispatch={dispatch}
                    course={course}
                    prefix={prefix}
                />
            )}
        </div>
    );
}
