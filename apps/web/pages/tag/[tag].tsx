import {
    HEADER_BLOG_POSTS_SECTION,
    HEADER_TAG_SECTION,
} from "../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { Grid, Typography } from "@mui/material";
import { getBackendAddress, getPage } from "../../ui-lib/utils";
import dynamic from "next/dynamic";
import { Course, Page } from "@courselit/common-models";
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
    }
  }
`;

interface PostsProps {
    courses: Course[];
    page: Page;
}

function Posts(props: PostsProps) {
    const router = useRouter();
    const { tag } = router.query;
    const generateQueryWithTag = generateQuery(tag as string);

    return (
        <BaseLayout
            title={HEADER_BLOG_POSTS_SECTION}
            layout={props.page.layout}
        >
            <Grid
                container
                sx={{
                    padding: 2,
                    minHeight: "80vh",
                }}
            >
                <Grid item sx={{ mb: 2 }}>
                    <Typography variant="h2">
                        {`${HEADER_TAG_SECTION} '${tag}'`}
                    </Typography>
                </Grid>
                <Grid item>
                    <Items
                        showLoadMoreButton={true}
                        generateQuery={generateQueryWithTag}
                        initialItems={props.courses}
                    />
                </Grid>
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
    const address = getBackendAddress(req.headers);
    const page = await getPage(address);
    const courses = await getCourses(getBackendAddress(req.headers), query.tag);
    return { props: { courses, page } };
}

export default Posts;
