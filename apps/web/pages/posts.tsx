import { HEADER_BLOG_POSTS_SECTION } from "../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { Grid, Typography } from "@mui/material";
import { getBackendAddress } from "../ui-lib/utils";
import { Section } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { Course } from "@courselit/common-models";
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

interface PostsProps {
    courses: Course[];
}

function Posts(props: PostsProps) {
    return (
        <BaseLayout title={HEADER_BLOG_POSTS_SECTION}>
            <Grid item xs={12}>
                <Section>
                    <Grid
                        container
                        sx={{
                            padding: 2,
                        }}
                    >
                        <Grid item container>
                            <Grid item xs={12}>
                                <Typography variant="h2">
                                    {HEADER_BLOG_POSTS_SECTION}
                                </Typography>
                            </Grid>
                        </Grid>
                        <Items
                            showLoadMoreButton={true}
                            generateQuery={generateQuery}
                            initialItems={props.courses}
                            posts={true}
                        />
                    </Grid>
                </Section>
            </Grid>
        </BaseLayout>
    );
}

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
    } catch (e) {}
    return courses;
};

export async function getServerSideProps({ req }: any) {
    const courses = await getCourses(getBackendAddress(req.headers.host));
    return { props: { courses } };
}

export default Posts;
