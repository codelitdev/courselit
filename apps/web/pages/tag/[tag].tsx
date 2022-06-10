import {
    HEADER_BLOG_POSTS_SECTION,
    HEADER_TAG_SECTION,
} from "../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { Grid, Typography } from "@mui/material";
import { getBackendAddress } from "../../ui-lib/utils";
import { Section } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { Course } from "@courselit/common-models";
import { useRouter } from "next/router";
import BaseLayout from "../../components/public/base-layout";

const Items = dynamic(() => import("../../components/public/items"));

const generateQuery =
    (tag: string) =>
    (pageOffset = 1) =>
        `
  query {
    courses: getCourses(offset: ${pageOffset}, tag: "${tag}") {
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
    const router = useRouter();
    const { tag } = router.query;
    const generateQueryWithTag = generateQuery(tag as string);

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
                                    {`${HEADER_TAG_SECTION} '${tag}'`}
                                </Typography>
                            </Grid>
                        </Grid>
                        <Items
                            showLoadMoreButton={true}
                            generateQuery={generateQueryWithTag}
                            initialItems={props.courses}
                        />
                    </Grid>
                </Section>
            </Grid>
        </BaseLayout>
    );
}

const getCourses = async (backend: string, tag: string) => {
    let courses = [];
    try {
        const fetch = new FetchBuilder()
            .setUrl(`${backend}/api/graph`)
            .setPayload(generateQuery(tag)())
            .setIsGraphQLEndpoint(true)
            .build();
        const response = await fetch.exec();
        courses = response.courses;
    } catch (e) {}
    return courses;
};

export async function getServerSideProps({ query, req }: any) {
    const courses = await getCourses(
        getBackendAddress(req.headers.host),
        query.tag
    );
    return { props: { courses } };
}

export default Posts;
