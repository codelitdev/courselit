"use client";

import { AddressContext, ProfileContext } from "@components/contexts";
import {
    Button2,
    Link,
    Section,
    Skeleton,
} from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    ACCOUNT_NO_PURCHASE_PLACEHOLDER,
    ACCOUNT_PROGRESS_SUFFIX,
    MY_CONTENT_HEADER,
    VISIT_COURSE_BUTTON,
} from "@ui-config/strings";
import { useContext, useEffect, useState } from "react";

export default function Page() {
    const [courses, setCourses] = useState([]);
    const [loaded, setLoaded] = useState(false);

    const profile = useContext(ProfileContext);
    const address = useContext(AddressContext);

    useEffect(() => {
        const loadEnrolledCourses = async () => {
            const query = `
            query {
                courses: getEnrolledCourses (userId: "${profile.userId}"){
                    courseId,
                    title,
                    type,
                    slug,
                    progress
                }
            }
            `;
            try {
                const fetch = new FetchBuilder()
                    .setUrl(`${address.backend}/api/graph`)
                    .setPayload(query)
                    .setIsGraphQLEndpoint(true)
                    .build();
                const response = await fetch.exec();
                if (response.courses) {
                    setCourses(response.courses);
                }
                setLoaded(true);
            } catch (e: any) {}
        };

        loadEnrolledCourses();
    }, [address.backend, profile.userId]);

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold mb-2">{MY_CONTENT_HEADER}</h1>
            {!loaded && (
                <div className="flex justify-center items-center flex-col gap-4">
                    <Skeleton className="w-full h-[120px]" />
                    <Skeleton className="w-full h-[110px]" />
                </div>
            )}
            {loaded &&
                courses.length > 0 &&
                courses.map((course: Record<string, string>) => (
                    <div className="mb-4" key={course.courseId as string}>
                        <Section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-medium text-lg">
                                    {course.title}
                                </h2>
                                <p>
                                    {(
                                        (course.progress as unknown) * 100
                                    ).toFixed(2)}
                                    {ACCOUNT_PROGRESS_SUFFIX}
                                </p>
                            </div>
                            <div className="flex justify-end">
                                <div>
                                    <Link
                                        href={`/course/${course.slug}/${course.courseId}`}
                                    >
                                        <Button2>{VISIT_COURSE_BUTTON}</Button2>
                                    </Link>
                                </div>
                            </div>
                        </Section>
                    </div>
                ))}
            {loaded && !courses.length && (
                <p className="text-slate-700">
                    {ACCOUNT_NO_PURCHASE_PLACEHOLDER}
                </p>
            )}
        </div>
    );
}
