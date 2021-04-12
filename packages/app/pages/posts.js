import PropTypes from "prop-types";
import { publicCourse } from "../types.js";
import { HEADER_BLOG_POSTS_SECTION } from "../config/strings.js";
import FetchBuilder from "../lib/fetch.js";
import { Grid, Typography } from "@material-ui/core";
import { getBackendAddress } from "../lib/utils.js";
import { Section } from "@courselit/components-library";
import dynamic from "next/dynamic";

const BaseLayout = dynamic(() => import("../components/Public/BaseLayout"));
const Items = dynamic(() => import("../components/Public/Items"));

const generateQuery = (pageOffset = 1) => `
  query {
    courses: getPosts(offset: ${pageOffset}) {
      id,
      title,
      description,
      updated,
      creatorName,
      slug,
      featuredImage,
      courseId
    }
  }
`;

function Posts(props) {
  return (
    <BaseLayout title={HEADER_BLOG_POSTS_SECTION}>
      <Grid item xs={12}>
        <Section>
          <Grid container spacing={2}>
            <Grid item container>
              <Grid item xs={12}>
                <Typography variant="h2">
                  {HEADER_BLOG_POSTS_SECTION}
                </Typography>
              </Grid>
            </Grid>
            <Grid item>
              <Items
                showLoadMoreButton={true}
                generateQuery={generateQuery}
                initialItems={props.courses}
                posts={true}
              />
            </Grid>
          </Grid>
        </Section>
      </Grid>
    </BaseLayout>
  );
}

const getCourses = async (backend) => {
  let courses = [];
  try {
    const fetch = new FetchBuilder()
      .setUrl(`${backend}/graph`)
      .setPayload(generateQuery())
      .setIsGraphQLEndpoint(true)
      .build();
    const response = await fetch.exec();
    courses = response.courses;
  } catch (e) {}
  return courses;
};

export async function getServerSideProps({ req }) {
  const courses = await getCourses(getBackendAddress(req.headers.host));
  return { props: { courses } };
}

Posts.propTypes = {
  courses: PropTypes.arrayOf(publicCourse),
};

export default Posts;
