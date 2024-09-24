"use client";

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
    Chip,
    LessonIcon,
    TextRenderer,
    Skeleton,
} from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
} from "./defaults";
import { Badge } from "@courselit/components-library";
import { Accordion } from "@courselit/components-library";
import { AccordionItem } from "@courselit/components-library";
import { AccordionTrigger } from "@courselit/components-library";
import { AccordionContent } from "@courselit/components-library";

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
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        cssId,
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
                course: getCourse(id: "${courseId}", asGuest: true) {
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
                        requiresEnrollment
                    },
                    groups {
                        id,
                        name,
                        rank,
                        lessonsOrder
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
                    .sort(
                        (a: any, b: any) =>
                            group.lessonsOrder.indexOf(a.lessonId) -
                            group.lessonsOrder.indexOf(b.lessonId),
                    );
            });
            setFormattedCourse(formattedCourse);
        }
    }, [course]);

    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
            id={cssId}
        >
            <div className="mx-auto lg:max-w-[1200px]">
                <div
                    className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%] gap-4`}
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
                        <div className="flex flex-col gap-2">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item}>
                                    <div className="flex gap-2 items-center mb-2">
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-6 w-[100px] rounded-[300px]" />
                                        <Skeleton className="h-6 w-6" />
                                    </div>
                                    <hr className="w-full" />
                                </div>
                            ))}
                        </div>
                    )}
                    <Accordion type="single" collapsible>
                        {Object.keys(formattedCourse).map((group, index) => (
                            <AccordionItem value={group} key={index}>
                                <AccordionTrigger>
                                    <div className="flex grow justify-between mr-2">
                                        <p>{group}</p>
                                        <Badge
                                            style={{
                                                color: badgeForegroundColor,
                                                backgroundColor:
                                                    badgeBackgroundColor,
                                            }}
                                        >
                                            {`${formattedCourse[group].length} lessons`}
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {formattedCourse[group].map(
                                        (lesson: Lesson) => (
                                            <div
                                                className="flex items-center gap-2 py-2 px-2 hover:bg-gray-100 rounded"
                                                key={lesson.lessonId}
                                            >
                                                <LessonIcon
                                                    type={
                                                        lesson.type as LessonType
                                                    }
                                                />
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
                                                            backgroundColor:
                                                                badgeBackgroundColor,
                                                        }}
                                                    >
                                                        Preview
                                                    </Chip>
                                                )}
                                            </div>
                                        ),
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </div>
        </section>
    );
}
