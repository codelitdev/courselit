import { connect } from "react-redux";
import Head from "next/head";
import {
  formulateCourseUrl,
  formulateMediaUrl,
  getPostDescriptionSnippet,
} from "../../../lib/utils.js";
import { Lock } from "@material-ui/icons";
import { BACKEND, FRONTEND, MEDIA_BACKEND } from "../../../config/constants.js";
import { SIDEBAR_TEXT_COURSE_ABOUT } from "../../../config/strings.js";
import CourseIntroduction from "../../../components/CourseIntroduction.js";
import LessonViewer from "../../../components/Public/LessonViewer.js";
import FetchBuilder from "../../../lib/fetch.js";
import AppError from "../../../components/AppError.js";
import ComponentScaffold from "../../../components/Public/BaseLayout/ComponentScaffold.js";

const Course = (props) => {
  const { course, profile, error } = props;
  const lessons = [];
  let key = 0;

  if (course) {
    lessons.push({
      name: SIDEBAR_TEXT_COURSE_ABOUT,
      element: <CourseIntroduction key={key++} course={course} />,
    });
    for (const lesson of course.lessons) {
      lessons.push({
        name: lesson.title,
        element: <LessonViewer key={key++} lesson={lesson} />,
        icon:
          lesson.requiresEnrollment &&
          !profile.purchases.includes(course.id) ? (
            <Lock />
          ) : null,
        iconPlacementRight: true,
      });
    }
  }

  return (
    <>
      {error && <AppError error={error} />}
      {!error && (
        <>
          <Head>
            <title>
              {course.title} | {props.siteInfo.title}
            </title>
            <meta
              name="viewport"
              content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
            />
            <meta
              property="og:url"
              content={formulateCourseUrl(course, FRONTEND)}
            />
            <meta property="og:type" content="article" />
            <meta property="og:title" content={course.title} />
            <meta
              property="og:description"
              content={getPostDescriptionSnippet(course.description)}
            />
            <meta property="og:author" content={course.creatorName} />
            {course.featuredImage && (
              <meta
                property="og:image"
                content={formulateMediaUrl(MEDIA_BACKEND, course.featuredImage)}
              />
            )}
          </Head>
          <ComponentScaffold items={lessons} />
        </>
      )}
    </>
  );
};

Course.getInitialProps = async ({ query }) => {
  const graphQuery = `
    query {
      post: getCourse(courseId: ${query.id}) {
        id,
        title,
        description,
        featuredImage,
        updated,
        creatorName,
        creatorId,
        slug,
        isBlog,
        cost,
        lessons {
          id,
          title,
          requiresEnrollment,
          courseId
        }
      }
    }
  `;
  const fetch = new FetchBuilder()
    .setUrl(`${BACKEND}/graph`)
    .setPayload(graphQuery)
    .setIsGraphQLEndpoint(true)
    .build();

  try {
    const response = await fetch.exec();
    return {
      course: response.post,
      error: null,
    };
  } catch (err) {
    return {
      course: null,
      error: err.message,
    };
  }
};

const mapStateToProps = (state) => ({
  profile: state.profile,
  siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(Course);
