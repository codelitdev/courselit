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
import { Button, Grid, Skeleton, Typography } from "@mui/material";
import { FetchBuilder } from "@courselit/utils";
import { Section } from "@courselit/components-library";
import Link from "next/link";
import { checkPermission } from "@courselit/utils";
import { UIConstants } from "@courselit/common-models";

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
            <Grid container sx={{ minHeight: "80vh" }} direction="column">
                <Grid item sx={{ p: 2 }}>
                    <Typography variant="h4">{MY_CONTENT_HEADER}</Typography>
                </Grid>
                {!loaded && (
                    <Grid item xs={12} sx={{ p: 2 }}>
                        <Skeleton variant="rectangular" height={132} />
                    </Grid>
                )}
                {loaded &&
                    courses.length > 0 &&
                    courses.map((course: Record<string, string>) => (
                        <Grid
                            item
                            key={course.courseId as string}
                            sx={{ p: 2 }}
                        >
                            <Section>
                                <Grid container direction="column" sx={{}}>
                                    <Grid item sx={{ mb: 4 }}>
                                        <Grid
                                            container
                                            alignItems="center"
                                            justifyContent="space-between"
                                        >
                                            <Grid item>
                                                <Typography variant="h6">
                                                    {course.title}
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <Typography>
                                                    {(
                                                        (course.progress as unknown) *
                                                        100
                                                    ).toFixed(2)}
                                                    {ACCOUNT_PROGRESS_SUFFIX}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Grid item alignSelf="flex-end">
                                        <Link
                                            href={`/course/${course.slug}/${course.courseId}`}
                                        >
                                            <Button variant="contained">
                                                {VISIT_COURSE_BUTTON}
                                            </Button>
                                        </Link>
                                    </Grid>
                                </Grid>
                            </Section>
                        </Grid>
                    ))}
                {loaded && !courses.length && (
                    <Grid item sx={{ p: 2 }}>
                        <Typography variant="body1">
                            {ACCOUNT_NO_PURCHASE_PLACEHOLDER}
                        </Typography>
                    </Grid>
                )}
            </Grid>
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
