import { Address } from "@courselit/common-models";
import { AppMessage, Course, Lesson } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";

export default function useCourse(id: string):
    | Partial<
          Course & {
              lessons: Pick<Lesson, "title" | "groupId" | "lessonId" | "type"> &
                  { id: string }[];
          }
      >
    | undefined {
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
