import { connect } from "react-redux";
import Head from "next/head";
import {
  formulateCourseUrl,
  getBackendAddress,
  getPostDescriptionSnippet,
} from "../../../lib/utils.js";
import { Lock } from "@material-ui/icons";
import { SIDEBAR_TEXT_COURSE_ABOUT } from "../../../config/strings.js";
import FetchBuilder from "../../../lib/fetch.js";
import dynamic from "next/dynamic";

const CourseIntroduction = dynamic(() =>
  import("../../../components/CourseIntroduction.js")
);
const LessonViewer = dynamic(() =>
  import("../../../components/Public/LessonViewer.js")
);
const AppError = dynamic(() => import("../../../components/AppError.js"));
const ComponentScaffold = dynamic(() =>
  import("../../../components/Public/BaseLayout/ComponentScaffold.js")
);

const Course = (props) => {
  const { course, profile, error } = props;
  const lessons = [];
  let key = 0;

  if (course) {
    lessons.push({
      name: SIDEBAR_TEXT_COURSE_ABOUT,
      element: <CourseIntroduction key={key++} course={course} />,
    });
    for (const group of Object.keys(course.groupOfLessons)) {
      lessons.push({
        name: group,
        element: null,
      });
      for (const lesson of course.groupOfLessons[group]) {
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
              content={formulateCourseUrl(course, props.address.frontend)}
            />
            <meta property="og:type" content="article" />
            <meta property="og:title" content={course.title} />
            <meta
              property="og:description"
              content={getPostDescriptionSnippet(course.description)}
            />
            <meta property="og:author" content={course.creatorName} />
            {course.featuredImage && (
              <meta property="og:image" content={course.featuredImage} />
            )}
          </Head>
          <ComponentScaffold items={lessons} />
        </>
      )}
    </>
  );
};

export async function getServerSideProps({ query, req }) {
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
        courseId,
        groups {
          id,
          name,
          rank
        },
        lessons {
          id,
          title,
          requiresEnrollment,
          courseId,
          groupId,
          groupRank
        }
      }
    }
  `;
  const fetch = new FetchBuilder()
    .setUrl(`${getBackendAddress(req.headers.host)}/graph`)
    .setPayload(graphQuery)
    .setIsGraphQLEndpoint(true)
    .build();

  try {
    const response = await fetch.exec();
    const { post } = response;
    if (post) {
      const lessonsOrderedByGroups = {};
      for (const group of response.post.groups) {
        lessonsOrderedByGroups[group.name] = response.post.lessons.filter(
          (lesson) => lesson.groupId === group.id
        );
      }

      const courseGroupedByLessons = {
        id: post.id,
        title: post.title,
        description: post.description,
        featuredImage: post.featuredImage,
        updated: post.updated,
        creatorName: post.creatorName,
        creatorId: post.creatorId,
        slug: post.slug,
        isBlog: post.isBlog,
        cost: post.cost,
        courseId: post.courseId,
        groupOfLessons: lessonsOrderedByGroups,
      };
      return {
        props: {
          course: courseGroupedByLessons,
          error: null,
        },
      };
    } else {
      return {
        props: {
          course: null,
          error: "Invalid response",
        },
      };
    }
  } catch (err) {
    return {
      props: {
        course: null,
        error: err.message,
      },
    };
  }
}

const mapStateToProps = (state) => ({
  profile: state.profile,
  siteInfo: state.siteinfo,
  address: state.address,
});

export default connect(mapStateToProps)(Course);
