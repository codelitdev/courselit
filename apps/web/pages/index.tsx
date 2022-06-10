import { connect } from "react-redux";
import { HEADER_BLOG_POSTS_SECTION, BTN_VIEW_ALL } from "../ui-config/strings";
import { Button, Grid, Typography } from "@mui/material";
import Link from "next/link";
import { getBackendAddress } from "../ui-lib/utils";
import dynamic from "next/dynamic";
import { Section } from "@courselit/components-library";
import type { SiteInfo, State } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import MuiLink from "@mui/material/Link";
import BaseLayout from "../components/public/base-layout";

const Items = dynamic(() => import("../components/public/items"));

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
          thumbnail 
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
    return (
        <BaseLayout title={props.siteinfo.subtitle}>
            <Grid item xs={12}>
                {props.courses.length > 0 && (
                    <Section>
                        <Grid
                            container
                            sx={{
                                padding: 2,
                            }}
                        >
                            <Grid
                                item
                                xs={12}
                                sx={{
                                    mb: 2,
                                }}
                            >
                                <Typography variant="h2">
                                    {HEADER_BLOG_POSTS_SECTION}
                                </Typography>
                            </Grid>
                            <Items
                                generateQuery={generateQuery}
                                initialItems={props.courses}
                                posts={true}
                            />
                            <Grid item xs={12}>
                                <Button variant="outlined">
                                    <Link href="/posts">
                                        <MuiLink
                                            sx={{
                                                textDecoration: "none",
                                                color: "inherit",
                                            }}
                                        >
                                            {BTN_VIEW_ALL}
                                        </MuiLink>
                                    </Link>
                                </Button>
                            </Grid>
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
