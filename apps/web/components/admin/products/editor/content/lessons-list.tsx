import React, { useState } from "react";
import { IconButton, Section } from "@courselit/components-library";
import { Button, Grid, Menu, MenuItem, Typography } from "@mui/material";
import Link from "next/link";
import {
    BUTTON_NEW_GROUP_TEXT,
    BUTTON_NEW_LESSON_TEXT,
    DELETE_SECTION_HEADER,
    EDIT_SECTION_HEADER,
} from "../../../../../ui-config/strings";
import useCourse from "../course-hook";
import { Add, MoreVert } from "@courselit/icons";
import { Course, Lesson } from "@courselit/common-models";
import { useRouter } from "next/router";
import { LessonIcon } from "@courselit/components-library";

interface LessonSectionProps {
    group: Record<string, unknown>;
    course: Partial<Course>;
}

function LessonSection({ group, course }: LessonSectionProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    const router = useRouter();

    return (
        <Section>
            <Grid
                container
                direction="column"
                sx={{
                    p: 1,
                }}
            >
                <Grid
                    item
                    xs={12}
                    sx={{
                        mb: 2,
                    }}
                >
                    <Grid
                        container
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Grid item>
                            <Typography variant="h6">{group.name}</Typography>
                        </Grid>
                        <Grid item>
                            <IconButton onClick={handleClick} variant="soft">
                                <MoreVert />
                            </IconButton>
                            <Menu
                                id="basic-menu"
                                anchorEl={anchorEl}
                                open={open}
                                onClose={handleClose}
                                MenuListProps={{
                                    "aria-labelledby": "section-menu",
                                }}
                            >
                                <MenuItem
                                    onClick={() =>
                                        router.replace(
                                            `/dashboard/product/${course.courseId}/section/${group.id}`,
                                        )
                                    }
                                >
                                    {EDIT_SECTION_HEADER}
                                </MenuItem>
                                <MenuItem onClick={handleClose}>
                                    {DELETE_SECTION_HEADER}
                                </MenuItem>
                            </Menu>
                        </Grid>
                    </Grid>
                </Grid>
                {course.lessons
                    .filter((lesson: Lesson) => lesson.groupId === group.id)
                    .sort((a: any, b: any) => a.groupRank - b.groupRank)
                    .map((lesson: Lesson) => (
                        <Grid item key={lesson.lessonId}>
                            <Grid container>
                                <Grid item sx={{ mr: 1 }}>
                                    <LessonIcon type={lesson.type} />
                                </Grid>
                                <Grid item>
                                    <Link
                                        href={`/dashboard/product/${course.courseId}/section/${group.id}/lesson/${lesson.lessonId}`}
                                    >
                                        {lesson.title}
                                    </Link>
                                </Grid>
                            </Grid>
                        </Grid>
                    ))}
                <Grid
                    item
                    sx={{
                        mt: 2,
                    }}
                >
                    <Link
                        href={`/dashboard/product/${course.courseId}/section/${group.id}/lesson/new`}
                        legacyBehavior
                    >
                        <Button component="a" startIcon={<Add />}>
                            {BUTTON_NEW_LESSON_TEXT}
                        </Button>
                    </Link>
                </Grid>
            </Grid>
        </Section>
    );
}

interface LessonsProps {
    id: string;
}

function LessonsList({ id }: LessonsProps) {
    const course = useCourse(id);

    if (!course) {
        return <></>;
    }

    return (
        <Grid container direction="column">
            {course.groups.map((group: Record<string, unknown>) => (
                <Grid
                    item
                    key={group.id as string}
                    sx={{
                        mb: 2,
                    }}
                >
                    <LessonSection group={group} course={course} />
                </Grid>
            ))}
            <Link href={`/dashboard/product/${id}/section/new`} legacyBehavior>
                <Button component="a">{BUTTON_NEW_GROUP_TEXT}</Button>
            </Link>
        </Grid>
    );
}

export default LessonsList;
