import { connect } from "react-redux";
import { BACKEND, FRONTEND, MEDIA_BACKEND } from "../../../config/constants.js";
import {
  formulateMediaUrl,
  formulateCourseUrl,
  // getPostDescriptionSnippet,
} from "../../../lib/utils.js";
import { makeStyles, Grid } from "@material-ui/core";
import Head from "next/head";
import FetchBuilder from "../../../lib/fetch.js";
import { siteInfoProps } from "../../../types.js";
import BaseLayout from "../../../components/Public/BaseLayout";
import Article from "../../../components/Public/Article.js";

const useStyles = makeStyles((theme) => ({
  content: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(4),
  },
}));

const Post = (props) => {
  const classes = useStyles();
  const articleOptions = {
    showAttribution: false,
  };

  return (
    <BaseLayout title={props.post.title}>
      {props.post && (
        <Grid item xs={12} className={classes.content}>
          <Head>
            <meta
              property="og:url"
              content={formulateCourseUrl(props.post, FRONTEND)}
            />
            <meta property="og:type" content="article" />
            <meta property="og:title" content={props.post.title} />
            {/** TODO: re-enable the following meta tag once SSR is supported */}
            {/* <meta
              property="og:description"
              content={getPostDescriptionSnippet(props.post.description)}
            /> */}
            <meta property="og:author" content={props.post.creatorName} />
            {props.post.featuredImage && (
              <meta
                property="og:image"
                content={formulateMediaUrl(
                  MEDIA_BACKEND,
                  props.post.featuredImage
                )}
              />
            )}
          </Head>
          <Article course={props.post} options={articleOptions} />
        </Grid>
      )}
    </BaseLayout>
  );
};

export async function getServerSideProps({ query }) {
  const graphQuery = `
    query {
      post: getCourse(courseId: ${query.id}) {
          id,
          title,
          description,
          featuredImage,
          updated,
          creatorName,
          creatorId,
          slug,
          isBlog
      }
    }
  `;
  const fetch = new FetchBuilder()
    .setUrl(`${BACKEND}/graph`)
    .setPayload(graphQuery)
    .setIsGraphQLEndpoint(true)
    .build();

  let post = null;
  try {
    const response = await fetch.exec();
    post = response.post;
  } catch (err) {
    post = {
      title: err.message,
    };
  }

  return {
    props: {
      post,
    },
  };
}

Post.propTypes = {
  siteInfo: siteInfoProps,
};

const mapStateToProps = (state) => ({
  siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(Post);
