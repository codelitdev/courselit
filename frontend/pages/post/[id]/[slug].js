import PropTypes from "prop-types";
import { connect } from "react-redux";
import MasterLayout from "../../../components/Masterlayout.js";
import { BACKEND, FRONTEND, MEDIA_BACKEND } from "../../../config/constants.js";
import {
  formulateMediaUrl,
  formulateCourseUrl,
  getPostDescriptionSnippet
} from "../../../lib/utils.js";
import { makeStyles } from "@material-ui/core";
import Head from "next/head";
import ContainedBodyLayout from "../../../components/ContainedBodyLayout.js";
import Article from "../../../components/Article.js";
import FetchBuilder from "../../../lib/fetch.js";
import { siteInfoProps } from "../../../types.js";

const useStyles = makeStyles(theme => ({
  articleMarginAdjust: {
    marginTop: theme.spacing(2)
  },
  articleMarginBottomAdjust: {
    marginBottom: theme.spacing(2)
  }
}))

const Post = props => {
  const classes = useStyles();
  const articleOptions = {
    showAttribution: false
  };

  return (
    <MasterLayout title={props.post.title}>
      {props.post && (
        <>
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
          <ContainedBodyLayout>
            <div className={classes.articleMarginAdjust} />
            <Article course={props.post} options={articleOptions} />
            <div className={classes.articleMarginBottomAdjust} />
          </ContainedBodyLayout>
        </>
      )}
    </MasterLayout>
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
}

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
});

export default connect(mapStateToProps)(Post);
