import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import BaseLayout from "../components/public/base-layout";
import {
    ACCOUNT_NO_PURCHASE_PLACEHOLDER,
    ACCOUNT_PROGRESS_SUFFIX,
    MY_CONTENT_HEADER,
    VISIT_COURSE_BUTTON,
} from "../ui-config/strings";
import { getBackendAddress, getPage } from "../ui-lib/utils";
import type { Address, Auth, Page, Profile } from "@courselit/common-models";
import { FetchBuilder, checkPermission } from "@courselit/utils";
import { Section, Button2 } from "@courselit/components-library";
import { UIConstants } from "@courselit/common-models";
import AppLoader from "../components/app-loader";
import Link from "next/link";

interface AccountProps {
    auth: Auth;
    page: Page;
    profile: Profile;
    address: Address;
}

function Account({ auth, page, profile, address }: AccountProps) {
    const [courses, setCourses] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (auth.checked && auth.guest) {
            router.push(`/login?redirect=${router.asPath}`);
        }
    }, [auth.checked]);

    useEffect(() => {
        if (profile.userId) {
            if (
                !checkPermission(profile.permissions, [
                    UIConstants.permissions.enrollInCourse,
                ])
            ) {
                router.replace("/");
            }

            loadEnrolledCourses();
        }
    }, [profile]);

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
        } catch (e: any) {
            console.error("My-content page", e.message);
        }
    };

    return (
        <BaseLayout layout={page.layout} title={MY_CONTENT_HEADER}>
            <div className="flex flex-col min-h-screen mx-auto lg:max-w-[1200px] w-full">
                <h1 className="text-4xl font-semibold p-4 my-4 lg:my-8">
                    {MY_CONTENT_HEADER}
                </h1>
                {!loaded && (
                    <div className="flex justify-center items-center">
                        <AppLoader />
                    </div>
                )}
                {loaded &&
                    courses.length > 0 &&
                    courses.map((course: Record<string, string>) => (
                        <div
                            className="px-4 mb-4"
                            key={course.courseId as string}
                        >
                            <Section className="p-2">
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
                                            <Button2>
                                                {VISIT_COURSE_BUTTON}
                                            </Button2>
                                        </Link>
                                    </div>
                                </div>
                            </Section>
                        </div>
                    ))}
                {loaded && !courses.length && (
                    <p className="p-4">{ACCOUNT_NO_PURCHASE_PLACEHOLDER}</p>
                )}
            </div>
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
    profile: state.profile,
});

export default connect(mapStateToProps)(Account);

export async function getServerSideProps(context: any) {
    const { req } = context;
    const address = getBackendAddress(req.headers);
    const page = await getPage(address);
    if (!page) {
        return {
            notFound: true,
        };
    }
    return { props: { page } };
}
