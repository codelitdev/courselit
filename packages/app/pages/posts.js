import PropTypes from "prop-types";
import { publicCourse } from "../types.js";
import { BACKEND } from "../config/constants.js";
import { HEADER_BLOG_POSTS_SECTION } from "../config/strings.js";
import BaseLayout from "../components/Public/BaseLayout";
import Items from "../components/Public/Items/List.js";
import FetchBuilder from "../lib/fetch.js";

const generateQuery = (pageOffset = 1) => `
  query {
    courses: getPublicCourses(offset: ${pageOffset}) {
      id
      title,
      description,
      featuredImage,
      updated,
      creatorName,
      cost,
      slug,
      isFeatured
    }
  }
`;

function Posts(props) {
  console.log(props);
  return (
    <BaseLayout title={HEADER_BLOG_POSTS_SECTION}>
      <Items showLoadMoreButton={true} generateQuery={generateQuery} initialItems={props.courses}/>
    </BaseLayout>
  );
};

const getCourses = async () => {
  let courses = [];
  try {
    const fetch = new FetchBuilder()
        .setUrl(`${BACKEND}/graph`)
        .setPayload(generateQuery())
        .setIsGraphQLEndpoint(true)
        .build();
    const response = await fetch.exec();
    courses = response.courses;
  } catch (e) {}
  // console.log(`Response`, courses);
  return courses;
};

export async function getServerSideProps() {
  const courses = await getCourses();
  return { props: { courses } }
}

Posts.propTypes = {
  courses: PropTypes.arrayOf(publicCourse)
};

export default Posts;
