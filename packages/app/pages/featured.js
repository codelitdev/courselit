import PropTypes from "prop-types";
import { publicCourse } from "../types.js";
import { capitalize, Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import FetchBuilder from "../lib/fetch.js";
import { useRouter } from "next/router";
import { getBackendAddress } from "../lib/utils";
import dynamic from "next/dynamic";

const BaseLayout = dynamic(() => import("../components/Public/BaseLayout"));
const Items = dynamic(() => import("../components/Public/Items"));

const useStyles = makeStyles((theme) => ({
  content: {
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2),
    },
    paddingTop: theme.spacing(2),
    marginBottom: theme.spacing(8),
  },
  header: {
    marginLeft: theme.spacing(2),
  },
  headerTop: {
    marginBottom: theme.spacing(2),
  },
}));

const generateQuery = (pageOffset = 1) => `
  query {
    courses: getCourses(offset: ${pageOffset}, onlyShowFeatured: true) {
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

const Courses = ({ courses }) => {
  const router = useRouter();
  const classes = useStyles();
  const path = capitalize(router.pathname.split("/")[1]);

  return (
    <BaseLayout title={path}>
      <Grid item xs={12} className={classes.content}>
        <Grid container component="section">
          <Grid item container className={classes.header}>
            <Grid item xs={12} className={classes.headerTop}>
              <Typography variant="h2">{path}</Typography>
            </Grid>
          </Grid>
          <Items
            showLoadMoreButton={true}
            generateQuery={generateQuery}
            initialItems={courses}
          />
        </Grid>
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
