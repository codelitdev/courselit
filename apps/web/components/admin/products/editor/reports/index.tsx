import React from "react";
import Grid from "@mui/material/Grid";
import useCourse from "../course-hook";
import Students from "./students";

interface CourseReportsProps {
    id: string;
}

export default function CourseReports({ id }: CourseReportsProps) {
    let course = useCourse(id);

    if (!course) {
        return <></>;
    }

    return (
        <Grid container>
            <Students course={course} />
        </Grid>
    );
}
