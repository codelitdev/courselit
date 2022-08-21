import { useRouter } from "next/router";
import RouteBasedComponentScaffold from "../../../../components/public/scaffold";
import LessonViewer from "../../../../components/public/lesson-viewer";
import { getServerSideProps, generateSideBarItems } from ".";
import type { Course, Profile } from "@courselit/common-models";
import { AppState } from "@courselit/state-management";
import { connect } from "react-redux";

interface LessonProps {
    course: Course;
    profile: Profile;
}

const Lesson = ({ course, profile }: LessonProps) => {
    const router = useRouter();
    const { lesson } = router.query;

    if (!router.isReady) {
        return <></>;
    }

    return (
        <RouteBasedComponentScaffold
            items={generateSideBarItems(
                course as Course & { groupOfLessons: string[] },
                profile
            )}
            contentPadding={0}
        >
            {" "}
            {lesson && (
                <LessonViewer lessonId={lesson as string} slug={course.slug} />
            )}
        </RouteBasedComponentScaffold>
    );
};

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(Lesson);

export { getServerSideProps };
