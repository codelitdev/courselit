import React from "react";
import useCourse from "../course-hook";
import Students from "./students";

interface CourseReportsProps {
    id: string;
}

export default function CourseReports({ id }: CourseReportsProps) {
    let course = useCourse(id);

    if (!course) {
        return null;
    }

    return (
        <div>
            <Students course={course} />
        </div>
    );
}
