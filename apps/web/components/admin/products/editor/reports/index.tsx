import React from "react";
import useCourse from "../course-hook";
import Students from "./students";
import { Address } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";

interface CourseReportsProps {
    id: string;
    address: Address;
    loading?: boolean;
    dispatch?: AppDispatch;
}

export default function CourseReports({
    id,
    address,
    loading = false,
    dispatch,
}: CourseReportsProps) {
    let course = useCourse(id, address);

    if (!course) {
        return null;
    }

    return (
        <div>
            <Students
                course={course}
                address={address}
                loading={loading}
                dispatch={dispatch}
            />
        </div>
    );
}
