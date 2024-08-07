import { Address } from "@courselit/common-models";
import { AppMessage, Lesson } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import { Course } from "@models/Course";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";

export type CourseFrontend = Partial<
    Course & {
        lessons: Pick<Lesson, "title" | "groupId" | "lessonId" | "type"> &
            { id: string }[];
    }
>;

export default function useCourse(id: string): CourseFrontend | undefined {
    const address: Address = useSelector((state: AppState) => state.address);
    const dispatch: AppDispatch = useDispatch();
    const [course, setCourse] = useState();

    useEffect(() => {
        if (id) {
            loadCourse(id);
        }
    }, [id]);

    const loadCourse = async (courseId: string) => {
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
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.course) {
                setCourse(response.course);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return course;
}
