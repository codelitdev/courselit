import { AppMessage, Course } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";

export default function useCourse(id: string): Partial<Course> {
    const address = useSelector((state: AppState) => state.address);
    const dispatch: AppDispatch = useDispatch();
    const [course, setCourse] = useState({
        id: "",
        title: "",
        courseId: "",
        lessons: [],
        type: "",
        groups: [],
    });

    useEffect(() => {
        if (id) {
            loadCourse(id);
        }
    }, [id]);

    const loadCourse = async (courseId: string) => {
        const query = `
            query {
                course: getCourse(courseId: "${courseId}") {
                    title,
                    id,
                    type,
                    lessons {
                    id,
                    title
                    },
                    groups {
                    id,
                    name,
                    rank
                    },
                    courseId
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
