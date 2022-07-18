import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import BaseLayout from "../components/public/base-layout";
import { PROFILE_MY_COURSES, PROFILE_PAGE_HEADER } from "../ui-config/strings";
import { getBackendAddress, getPage } from "../ui-lib/utils";
import type { Address, Auth, Page, Profile } from "@courselit/common-models";
import { Grid, Skeleton, Typography } from "@mui/material";
import { FetchBuilder } from "@courselit/utils";

interface AccountProps {
    auth: Auth;
    page: Page;
    profile: Profile;
    address: Address;
}

function Account({ auth, page, profile, address }: AccountProps) {
    const [courses, setCourses] = useState([]);
    const router = useRouter();

    useEffect(() => {
        if (auth.checked && auth.guest) {
            router.push(`/login?redirect=${router.asPath}`);
        }
    }, [auth.checked]);

    useEffect(() => {
        if (profile.userId) {
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
        } catch (e: any) {
            console.log("Accounts page", e.message); // eslint-disable-line no-console
        }
    };

    return (
        <BaseLayout layout={page.layout} title={PROFILE_PAGE_HEADER}>
            <Grid container sx={{ minHeight: "80vh" }} direction="column">
                <Grid item sx={{ p: 2 }}>
                    <Typography variant="h4">{PROFILE_MY_COURSES}</Typography>
                </Grid>
                {!courses.length && (
                    <Grid item xs={12} sx={{ p: 2 }}>
                        <Skeleton variant="rectangular" height={200} />
                    </Grid>
                )}
                {courses.map((course: Record<string, unknown>) => (
                    <Grid item key={course.courseId as string} sx={{ p: 2 }}>
                        <p>{course.title as string}</p>
                    </Grid>
                ))}
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
    const address = getBackendAddress(req.headers.host);
    const page = await getPage(address);
    if (!page) {
        return {
            notFound: true,
        };
    }
    return { props: { page } };
}
