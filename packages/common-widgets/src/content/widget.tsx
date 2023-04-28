import * as React from "react";
import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import { LessonIcon, TextRenderer } from "@courselit/components-library";
import {
    AppMessage,
    Course,
    Group,
    Lesson,
    LessonType,
    WidgetProps,
} from "@courselit/common-models";
import Settings from "./settings";
import Typography from "@mui/material/Typography";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import { Link } from "@courselit/components-library";

interface CourseWithGroups extends Course {
    groups: Group[];
    lessons: Lesson[];
}

export default function Widget({
    settings: {
        title,
        description,
        headerAlignment,
        backgroundColor,
        foregroundColor,
        badgeBackgroundColor,
        badgeForegroundColor,
        entityId,
    },
    state,
    dispatch,
}: WidgetProps<Settings>) {
    const [course, setCourse] = useState<CourseWithGroups>(null);
    const [formattedCourse, setFormattedCourse] = useState<
        Record<string, Lesson[]>
    >({});

    useEffect(() => {
        if (entityId) {
            loadCourse(entityId);
        }
    }, [entityId]);

    const loadCourse = async (courseId: string) => {
        const query = `
            query {
                course: getCourse(id: "${courseId}") {
                    title,
                    description,
                    id,
                    type,
                    lessons {
                        id,
                        title,
                        groupId,
                        lessonId,
                        type,
                        groupRank,
                        requiresEnrollment
                    },
                    groups {
                        id,
                        name,
                        rank
                    },
                    courseId,
                    cost,
                    featuredImage {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                    published,
                    privacy,
                    pageId,
                    slug
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${state.address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(actionCreators.networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                setCourse(response.course);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(actionCreators.networkAction(false));
        }
    };

    useEffect(() => {
        if (course) {
            const formattedCourse: Record<string, Lesson[]> = {};
            course.groups.map((group) => {
                formattedCourse[group.name] = course.lessons
                    .filter((lesson: Lesson) => lesson.groupId === group.id)
                    .sort((a: any, b: any) => a.groupRank - b.groupRank);
            });
            setFormattedCourse(formattedCourse);
        }
    }, [course]);

    return (
        <Grid
            container
            direction="column"
            sx={{
                p: 2,
                backgroundColor,
                color: foregroundColor,
            }}
        >
            <Grid item sx={{ mb: 2 }}>
                <Grid
                    container
                    direction="column"
                    alignItems={
                        headerAlignment === "center" ? "center" : "flex-start"
                    }
                >
                    <Grid item>
                        <Typography variant="h4">{title}</Typography>
                    </Grid>
                    {description && (
                        <Grid
                            item
                            sx={{
                                textAlign:
                                    headerAlignment === "center"
                                        ? "center"
                                        : "left",
                            }}
                        >
                            <TextRenderer json={description} />
                        </Grid>
                    )}
                </Grid>
            </Grid>
            {!course && (
                <Grid item>
                    <Grid container spacing={1}>
                        <Grid item xs={12}>
                            <Skeleton variant="rectangular" height={50} />
                        </Grid>
                        <Grid item xs={12}>
                            <Skeleton variant="text" />
                        </Grid>
                        <Grid item xs={12}>
                            <Skeleton variant="text" />
                        </Grid>
                        <Grid item xs={12}>
                            <Skeleton variant="text" />
                        </Grid>
                    </Grid>
                </Grid>
            )}
            {Object.keys(formattedCourse).map((group, index) => (
                <Grid item sx={{ mt: index > 0 ? 3 : 0 }}>
                    <Grid container direction="column">
                        <Grid item>
                            <Grid container spacing={1} alignItems="center">
                                <Grid item>
                                    <Typography variant="h5" sx={{ mb: 1 }}>
                                        {group}
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <Chip
                                        label={`${formattedCourse[group].length} lessons`}
                                        size="small"
                                        sx={{
                                            color: badgeForegroundColor,
                                            backgroundColor:
                                                badgeBackgroundColor,
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                        {formattedCourse[group].map((lesson: Lesson) => (
                            <Grid item key={lesson.lessonId}>
                                <Grid container>
                                    <Grid item sx={{ mr: 1 }}>
                                        <LessonIcon
                                            type={lesson.type as LessonType}
                                        />
                                    </Grid>
                                    <Grid item>
                                        <Link
                                            href={`/course/${course.slug}/${course.courseId}/${lesson.lessonId}`}
                                            sxProps={{
                                                color: foregroundColor,
                                            }}
                                        >
                                            {lesson.title}
                                        </Link>
                                    </Grid>
                                    {!lesson.requiresEnrollment && (
                                        <Grid item sx={{ ml: 1 }}>
                                            <Chip
                                                label={`Preview`}
                                                size="small"
                                                sx={{
                                                    color: badgeForegroundColor,
                                                    backgroundColor:
                                                        badgeBackgroundColor,
                                                }}
                                            />
                                        </Grid>
                                    )}
                                </Grid>
                            </Grid>
                        ))}
                    </Grid>
                </Grid>
                // <Grid item sx={{ mt: index > 0 ? 2 : 0 }}>
                //     <Typography variant="h6" sx={{ mb: 1 }}>
                //         {group.name}
                //     </Typography>
                //     {course.lessons
                //         .filter(
                //             (lesson: Lesson) => lesson.groupId === group.id
                //         )
                //         .sort((a: any, b: any) => a.groupRank - b.groupRank)
                //         .map((lesson: Lesson) => (
                //             <Grid item key={lesson.lessonId}>
                //                 <Grid container>
                //                     <Grid item sx={{ mr: 1 }}>
                //                         <LessonIcon
                //                             type={lesson.type as LessonType}
                //                         />
                //                     </Grid>
                //                     <Grid item>{lesson.title}</Grid>
                //                 </Grid>
                //             </Grid>
                //         ))}
                // </Grid>
            ))}
        </Grid>
    );
}
