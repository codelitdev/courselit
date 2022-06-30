import React from "react";
import { Button, Grid, Typography } from "@mui/material";
import {
    COURSE_TYPE_COURSE,
    COURSE_TYPE_DOWNLOAD,
} from "../../../../ui-config/constants";
import useCourse from "./course-hook";
import dynamic from "next/dynamic";

const LessonsList = dynamic(() => import("./lessons-list"));

interface EditorProps {
    id: string;
}

export default function Content({ id }: EditorProps) {
    const course = useCourse(id);
    console.log(course);

    return (
        <Grid container direction="column" spacing={2}>
            <Grid item>
                {course.type.toLowerCase() === COURSE_TYPE_COURSE && (
                    <LessonsList id={id} />
                )}
                {course.type.toLowerCase() === COURSE_TYPE_DOWNLOAD && (
                    <Typography>downloads</Typography>
                )}
            </Grid>
        </Grid>
    );
}
