import { connect } from "react-redux";
import {
    formulateCourseUrl,
    getBackendAddress,
    getPage,
} from "../../../ui-lib/utils";
import { Grid } from "@mui/material";
import Head from "next/head";
import { FetchBuilder } from "@courselit/utils";
import type { SiteInfo, Address, Course, Page } from "@courselit/common-models";
import type { AppState } from "@courselit/state-management";
import dynamic from "next/dynamic";
import BaseLayout from "../../../components/public/base-layout";
import { Link } from "@courselit/components-library";
import { BACK_TO_BLOG } from "../../../ui-config/strings";

const Article = dynamic(() => import("../../../components/public/article"));

interface PostProps {
    siteInfo: SiteInfo;
    address: Address;
    post: Course;
    page: Page;
}

const Post = ({ siteInfo, address, post, page }: PostProps) => {
    const articleOptions = {
        showAttribution: true,
    };

    return (
        <BaseLayout
            title={post.title}
            layout={page.layout}
            childrenOnTop={true}
        >
            {post && (
                <Grid container direction="column" sx={{ minHeight: "80vh" }}>
                    <Head>
                        <meta
                            property="og:url"
                            content={formulateCourseUrl(post, address.frontend)}
                        />
                        <meta property="og:type" content="article" />
                        <meta property="og:title" content={post.title} />
                        {/** TODO: re-enable the following meta tag once SSR is supported */}
                        {/* <meta
              property="og:description"
              content={getPostDescriptionSnippet(post.description)}
            /> */}
                        <meta property="og:author" content={post.creatorName} />
                        {post.featuredImage && (
                            <meta
                                property="og:image"
                                content={
                                    post.featuredImage &&
                                    post.featuredImage.thumbnail
                                }
                            />
                        )}
                    </Head>
                    <Grid item sx={{ mb: 2, p: 2 }}>
                        <Article course={post} options={articleOptions} />
                    </Grid>
                    <Grid item sx={{ p: 2 }}>
                        <Link href="/blog">{BACK_TO_BLOG}</Link>
                    </Grid>
                </Grid>
            )}
        </BaseLayout>
    );
};

export async function getServerSideProps({ query, req }: any) {
    const address = getBackendAddress(req.headers);
    const page = await getPage(address, "blog");
    const graphQuery = `
    query {
      post: getCourse(id: "${query.id}") {
          id,
          title,
          description,
          featuredImage {
            file,
            caption
          },
          updatedAt,
          creatorName,
          creatorId,
          slug,
          courseId,
          tags
      }
    }
  `;
    const fetch = new FetchBuilder()
        .setUrl(`${address}/api/graph`)
        .setPayload(graphQuery)
        .setIsGraphQLEndpoint(true)
        .build();

    let post = null;
    try {
        const response = await fetch.exec();
        post = response.post;
    } catch (err) {
        console.error(err);
        return {
            notFound: true,
        };
    }

    return {
        props: {
            post,
            page,
        },
    };
}

const mapStateToProps = (state: AppState) => ({
    siteInfo: state.siteinfo,
    address: state.address,
});

export default connect(mapStateToProps)(Post);
