import { useRouter } from "next/router";
import RouteBasedComponentScaffold from "../../../../components/public/scaffold";
import LessonViewer from "../../../../components/public/lesson-viewer";
import {
    getServerSideProps,
    generateSideBarItems,
    CourseFrontend,
    formatCourse,
    graphQuery,
} from ".";
import type {
    Address,
    Lesson,
    Profile,
    SiteInfo,
} from "@courselit/common-models";
import { AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { useEffect, useState } from "react";
import { FetchBuilder } from "@courselit/utils";
import Head from "next/head";

interface LessonProps {
    course: CourseFrontend;
    profile: Profile;
    address: Address;
    siteInfo: SiteInfo;
}

const Lesson = (props: LessonProps) => {
    const { profile, address, siteInfo } = props;
    const [course, setCourse] = useState<CourseFrontend | null>(props.course);
    const router = useRouter();
    const { lesson } = router.query;
    const siteImage = course.featuredImage || siteInfo.logo;

    useEffect(() => {
        if (profile.fetched) {
            loadCourse();
        }
    }, [profile]);

    const loadCourse = async () => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: graphQuery,
                variables: { id: props.course.courseId },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            const { post } = response;
            if (post) {
                setCourse(formatCourse(post));
            }
        } catch (err: any) {}
    };

    if (!router.isReady) {
        return <></>;
    }

    return (
        <>
            <Head>
                <title>{course.title}</title>
                <meta
                    name="viewport"
                    content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
                />
                <meta property="og:title" content={course.title} />
                <meta property="og:author" content={course.creatorName} />
                <meta property="og:image" content={siteImage.file} />
            </Head>
            <RouteBasedComponentScaffold
                items={generateSideBarItems(course, profile)}
                drawerWidth={360}
                showCourseLitBranding={true}
            >
                {lesson && (
                    <LessonViewer
                        lessonId={lesson as string}
                        slug={course.slug}
                    />
                )}
            </RouteBasedComponentScaffold>
        </>
    );
};

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    siteInfo: state.siteinfo,
    address: state.address,
});

export default connect(mapStateToProps)(Lesson);

export { getServerSideProps };
