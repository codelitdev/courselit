import { Address, AppMessage, Course } from "@courselit/common-models";
import { AppDispatch /*AppState*/ } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import { useCallback, useEffect, useState } from "react";

type CourseWithAdminProps = Partial<
    Course & {
        published: boolean;
        privacy: string;
    }
>;

export default function useCourse(
    id: string,
    address: Address,
    dispatch?: AppDispatch,
): CourseWithAdminProps | undefined | null {
    // const address = useSelector((state: AppState) => state.address);
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
                    courseId,
                    slug,
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
        [address?.backend, dispatch],
    );

    useEffect(() => {
        if (id && address) {
            loadCourse(id);
        }
    }, [id, address, loadCourse]);

    return course;
}
