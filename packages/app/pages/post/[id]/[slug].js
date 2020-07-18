import { connect } from "react-redux";
import { BACKEND, FRONTEND, MEDIA_BACKEND } from "../../../config/constants.js";
import {
  formulateMediaUrl,
  formulateCourseUrl,
  getPostDescriptionSnippet
} from "../../../lib/utils.js";
import { makeStyles, Grid } from "@material-ui/core";
import Head from "next/head";
import FetchBuilder from "../../../lib/fetch.js";
import { siteInfoProps } from "../../../types.js";
import BaseLayout from "../../../components/Public/BaseLayout";
import Article from "../../../components/Public/Article.js";

const useStyles = makeStyles(theme => ({
  articleMarginAdjust: {
    marginTop: theme.spacing(2)
  },
  articleMarginBottomAdjust: {
    marginBottom: theme.spacing(2)
  }
}));

const Post = props => {
  const classes = useStyles();
  const articleOptions = {
    showAttribution: false
  };

  return (
    <BaseLayout title={props.post.title}>
      {props.post && (
        <Grid item xs={12}>
          <Head>
            <meta
              property="og:url"
              content={formulateCourseUrl(props.post, FRONTEND)}
            />
            <meta property="og:type" content="article" />
            <meta property="og:title" content={props.post.title} />
            <meta
              property="og:description"
              content={getPostDescriptionSnippet(props.post.description)}
            />
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
          <>
            <div className={classes.articleMarginAdjust} />
            <Article course={props.post} options={articleOptions} />
            <div className={classes.articleMarginBottomAdjust} />
          </>
        </Grid>
      )}
    </BaseLayout>
  );
};

Post.getInitialProps = async ({ query }) => {
  const graphQuery = `
    query {
      post: getCourse(id: "${query.id}") {
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
  const response = await fetch.exec();

  return { post: response.post };
};

Post.propTypes = {
  siteInfo: siteInfoProps
};

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
});

export default connect(mapStateToProps)(Post);
