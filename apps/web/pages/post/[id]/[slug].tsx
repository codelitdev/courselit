import { connect } from "react-redux";
import { formulateCourseUrl, getBackendAddress } from "../../../ui-lib/utils";
import { Grid } from "@mui/material";
import Head from "next/head";
import { FetchBuilder } from "@courselit/utils";
import type { SiteInfo, Address, Course } from "@courselit/common-models";
import type { AppState } from "@courselit/state-management";
import dynamic from "next/dynamic";
import BaseLayout from "../../../components/public/base-layout";

const Article = dynamic(() => import("../../../components/public/article"));

interface PostProps {
    siteInfo: SiteInfo;
    address: Address;
    post: Course;
}

const Post = (props: PostProps) => {
    const articleOptions = {
        showAttribution: true,
    };

    return (
        <BaseLayout title={props.post.title}>
            {props.post && (
                <Grid item xs={12}>
                    <Head>
                        <meta
                            property="og:url"
                            content={formulateCourseUrl(
                                props.post,
                                props.address.frontend
                            )}
                        />
                        <meta property="og:type" content="article" />
                        <meta property="og:title" content={props.post.title} />
                        {/** TODO: re-enable the following meta tag once SSR is supported */}
                        {/* <meta
              property="og:description"
              content={getPostDescriptionSnippet(props.post.description)}
            /> */}
                        <meta
                            property="og:author"
                            content={props.post.creatorName}
                        />
                        {props.post.featuredImage && (
                            <meta
                                property="og:image"
                                content={
                                    props.post.featuredImage &&
                                    props.post.featuredImage.file
                                }
                            />
                        )}
                    </Head>
                    <Article course={props.post} options={articleOptions} />
                </Grid>
            )}
        </BaseLayout>
    );
};

export async function getServerSideProps({ query, req }: any) {
    const graphQuery = `
    query {
      post: getCourse(courseId: "${query.id}") {
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
          isBlog,
          courseId,
          tags
      }
    }
  `;
    const fetch = new FetchBuilder()
        .setUrl(`${getBackendAddress(req.headers.host)}/api/graph`)
        .setPayload(graphQuery)
        .setIsGraphQLEndpoint(true)
        .build();

    let post = null;
    try {
        const response = await fetch.exec();
        post = response.post;
    } catch (err) {
        return {
            notFound: true,
        };
    }

    return {
        props: {
            post,
        },
    };
}

const mapStateToProps = (state: AppState) => ({
    siteInfo: state.siteinfo,
    address: state.address,
});

export default connect(mapStateToProps)(Post);
