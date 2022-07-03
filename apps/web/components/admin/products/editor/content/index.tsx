import React from "react";
import { Button, Grid, Typography } from "@mui/material";
import {
    COURSE_TYPE_COURSE,
    COURSE_TYPE_DOWNLOAD,
} from "../../../../../ui-config/constants";
import useCourse from "../course-hook";
import dynamic from "next/dynamic";

const LessonsList = dynamic(() => import("./lessons-list"));

interface EditorProps {
    id: string;
}

export default function Content({ id }: EditorProps) {
    const course = useCourse(id);

    return (
        <Grid container direction="column" spacing={2}>
            {course && (
                <Grid item>
                    {[COURSE_TYPE_COURSE, COURSE_TYPE_DOWNLOAD].includes(
                        course!.type!.toLowerCase()
                    ) && <LessonsList id={id} />}
                </Grid>
            )}
        </Grid>
    );
}
