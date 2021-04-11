import PropTypes from "prop-types";
import { publicCourse } from "../types.js";
import { capitalize, Grid, Typography } from "@material-ui/core";
import FetchBuilder from "../lib/fetch.js";
import { useRouter } from "next/router";
import { getBackendAddress } from "../lib/utils";
import { Section } from "@courselit/components-library";
import dynamic from "next/dynamic";

const BaseLayout = dynamic(() => import("../components/Public/BaseLayout"));
const Items = dynamic(() => import("../components/Public/Items"));

const generateQuery = (pageOffset = 1) => `
  query {
    courses: getCourses(offset: ${pageOffset}) {
      id
      title,
      description,
      featuredImage,
      updated,
      creatorName,
      cost,
      slug,
      isFeatured,
      courseId
    }
  }
`;

const Courses = (props) => {
  const router = useRouter();
  const path = capitalize(router.pathname.split("/")[1]);

  return (
    <BaseLayout title={path}>
      <Grid item xs={12}>
        <Section>
          <Grid container spacing={2}>
            <Grid item container>
              <Grid item xs={12}>
                <Typography variant="h2">{path}</Typography>
              </Grid>
            </Grid>
            <Grid item>
              <Items
                showLoadMoreButton={true}
                generateQuery={generateQuery}
                initialItems={props.courses}
              />
            </Grid>
          </Grid>
        </Section>
      </Grid>
    </BaseLayout>
  );
};

const getCourses = async (backend) => {
  let courses = [];
  const query = generateQuery();
  try {
    const fetch = new FetchBuilder()
      .setUrl(`${backend}/graph`)
      .setPayload(query)
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

Courses.propTypes = {
  courses: PropTypes.arrayOf(publicCourse),
};

export default Courses;
