import React, { useEffect, useState } from "react";
import {
    AppMessage,
    Course,
    Group,
    Lesson,
    LessonType,
    WidgetProps,
} from "@courselit/common-models";
import Settings from "./settings";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import {
    Link,
    CircularProgress,
    Chip,
    LessonIcon,
    TextRenderer,
} from "@courselit/components-library";

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
    },
    state,
    dispatch,
    pageData: product,
}: WidgetProps<Settings>) {
    const [course, setCourse] = useState<CourseWithGroups>();
    const [formattedCourse, setFormattedCourse] = useState<
        Record<string, Lesson[]>
    >({});

    useEffect(() => {
        if (product.courseId) {
            loadCourse(product.courseId as string);
        }
    }, [product]);

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
        <section
            className="flex flex-col p-4 gap-4"
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
        >
            <div
                className={`flex flex-col mb-4 ${
                    headerAlignment === "center"
                        ? "items-center"
                        : "items-start"
                }`}
            >
                <h2 className="mb-4 text-4xl">{title}</h2>
                {description && (
                    <div
                        className={`${
                            headerAlignment === "center"
                                ? "text-center"
                                : "text-left"
                        }`}
                    >
                        <TextRenderer json={description} />
                    </div>
                )}
            </div>
            {!course && (
                <div className="flex flex-col items-center">
                    <CircularProgress />
                </div>
            )}
            {Object.keys(formattedCourse).map((group, index) => (
                <div key={index} className="flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-2xl">{group}</h3>
                        <Chip
                            style={{
                                color: badgeForegroundColor,
                                backgroundColor: badgeBackgroundColor,
                            }}
                        >
                            {`${formattedCourse[group].length} lessons`}
                        </Chip>
                    </div>
                    {formattedCourse[group].map((lesson: Lesson) => (
                        <div
                            className="flex items-center gap-2"
                            key={lesson.lessonId}
                        >
                            <LessonIcon type={lesson.type as LessonType} />
                            <Link
                                href={`/course/${course.slug}/${course.courseId}/${lesson.lessonId}`}
                                style={{
                                    color: foregroundColor,
                                }}
                            >
                                {lesson.title}
                            </Link>
                            {!lesson.requiresEnrollment && (
                                <Chip
                                    style={{
                                        color: badgeForegroundColor,
                                        backgroundColor: badgeBackgroundColor,
                                    }}
                                >
                                    Preview
                                </Chip>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </section>
    );
}
