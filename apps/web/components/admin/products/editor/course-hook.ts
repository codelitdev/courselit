import { Address } from "@courselit/common-models";
import { AppMessage, Lesson } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import { Course } from "@models/Course";
import { useCallback, useEffect, useState } from "react";

export type CourseWithAdminProps = Partial<
    Course & {
        lessons: Pick<Lesson, "title" | "groupId" | "lessonId" | "type"> &
            { id: string }[];
    }
>;

export default function useCourse(
    id: string,
    address: Address,
    dispatch?: AppDispatch,
): CourseWithAdminProps | undefined | null {
    const [course, setCourse] = useState<
        CourseWithAdminProps | undefined | null
    >();

    const loadCourse = useCallback(
        async (courseId: string) => {
            const query = `
            query {
                course: getCourse(id: "${courseId}") {
                    title,
                    description,
                    id,
                    type,
                    slug,
                    lessons {
                        id,
                        title,
                        groupId,
                        lessonId,
                        type
                    },
                    groups {
                        id,
                        name,
                        rank,
                        lessonsOrder,
                        drip {
                            type,
                            status,
                            delayInMillis,
                            dateInUTC,
                            email {
                                content,
                                subject
                            }
                        }
                    },
                    courseId,
                    cost,
                    costType,
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
                    pageId
                }
            }
        `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            try {
                dispatch && dispatch(networkAction(true));
                const response = await fetch.exec();
                if (response.course) {
                    setCourse(response.course);
                } else {
                    setCourse(null);
                }
            } catch (err: any) {
                setCourse(null);
                dispatch &&
                    dispatch(setAppMessage(new AppMessage(err.message)));
            } finally {
                dispatch && dispatch(networkAction(false));
            }
        },
        [dispatch, address?.backend],
    );

    useEffect(() => {
        if (id && address) {
            loadCourse(id);
        }
    }, [id, address, loadCourse]);

    return course;
}
