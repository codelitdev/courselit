import { connect } from "react-redux";
import { HEADER_BLOG_POSTS_SECTION, BTN_VIEW_ALL } from "../ui-config/strings";
import { Button, Grid, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import Link from "next/link";
import { getBackendAddress } from "../ui-lib/utils";
import dynamic from "next/dynamic";
import { Section } from "@courselit/components-library";
import type { SiteInfo, State } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";

const BaseLayout = dynamic(() => import("../components/Public/BaseLayout"));
const Items = dynamic(() => import("../components/Public/Items"));

const useStyles = makeStyles((theme: any) => ({
  headerTop: {
    marginBottom: theme.spacing(2),
  },
  link: {
    textDecoration: "none",
    color: "inherit",
  },
}));

const generateQuery = (pageOffset = 1) => `
  query {
    courses: getCourses(offset: ${pageOffset}, filterBy: POST) {
      id,
      title,
      description,
      updatedAt,
      creatorName,
      slug,
      featuredImage {
        file
      },
      courseId,
      isBlog
    }
  }
`;

interface IndexProps {
  siteinfo: SiteInfo;
  courses: any;
}

const Index = (props: IndexProps) => {
  const classes = useStyles();

  return (
    <BaseLayout title={props.siteinfo.subtitle}>
      <Grid item xs={12}>
        {props.courses.length > 0 && (
          <Section>
            <Grid item container>
              <Grid item xs={12} className={classes.headerTop}>
                <Typography variant="h2">
                  {HEADER_BLOG_POSTS_SECTION}
                </Typography>
              </Grid>
            </Grid>
            <Items
              generateQuery={generateQuery}
              initialItems={props.courses}
              posts={true}
            />
            <Grid item xs={12}>
              <Button>
                <Link href="/posts">
                  <a className={classes.link}>{BTN_VIEW_ALL}</a>
                </Link>
              </Button>
            </Grid>
          </Section>
        )}
      </Grid>
    </BaseLayout>
  );
};

const getCourses = async (backend: string) => {
  let courses = [];
  try {
    const fetch = new FetchBuilder()
      .setUrl(`${backend}/api/graph`)
      .setPayload(generateQuery())
      .setIsGraphQLEndpoint(true)
      .build();
    const response = await fetch.exec();
    courses = response.courses;
  } catch (e: any) {
    console.log(e.message); // eslint-disable-line no-console
  }
  return courses;
};

export async function getServerSideProps(context: any) {
  const { req } = context;
  const address = getBackendAddress(req.headers.host);
  const courses = await getCourses(address);
  return { props: { courses } };
}

const mapStateToProps = (state: State) => ({
  siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(Index);
