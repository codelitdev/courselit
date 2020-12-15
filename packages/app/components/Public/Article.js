import React from "react";
import { Typography, Grid } from "@material-ui/core";
import Link from "next/link";
import TextEditor from "./RichText.js";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/styles";
import { MEDIA_BACKEND } from "../../config/constants.js";
import { formulateMediaUrl, formattedLocaleDate } from "../../lib/utils";
import { publicCourse, profileProps } from "../../types";
import BuyButton from "../CheckoutExternal";
import { connect } from "react-redux";
import { PriceTag } from "@courselit/components-library";
import { FREE_COST } from "../../config/strings.js";

const useStyles = (featuredImage) =>
  makeStyles((theme) => ({
    header: {
      marginBottom: theme.spacing(1),
      [theme.breakpoints.up("sm")]: {
        marginBottom: theme.spacing(4),
      },
    },
    creatoravatarcontainer: {
      display: "flex",
      alignItems: "center",
    },
    creatorcard: {
      paddingTop: "0.8em",
    },
    creatoravatar: {
      borderRadius: "1.5em",
      width: "3em",
      marginRight: "1em",
    },
    featuredimagecontainer: {
      width: "100%",
      height: 240,
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(4),
      [theme.breakpoints.up("sm")]: {
        height: 480,
        backgroundSize: "cover",
      },
      overflow: "hidden",
      background: `url('${formulateMediaUrl(
        MEDIA_BACKEND,
        featuredImage
      )}') no-repeat center center`,
      backgroundSize: "contain",
    },
    enrollmentArea: {
      marginTop: theme.spacing(3),
      marginBottom: theme.spacing(4),
    },
    enrollmentAreaPriceTag: {
      marginRight: theme.spacing(2),
    },
  }));

const Article = (props) => {
  const { course, options, profile } = props;
  const classes = useStyles(course.featuredImage)();
  let courseDescriptionHydrated;
  try {
    courseDescriptionHydrated = TextEditor.hydrate({
      data: course.description,
    });
  } catch (err) {
    // do nothing
  }

  return (
    <article>
      <Typography variant="h2" className={classes.header}>
        {course.title}
      </Typography>
      {options.showAttribution && (
        <Grid container className={classes.creatorcard}>
          <Grid item className={classes.creatoravatarcontainer}>
            <img src="/static/logo.jpg" className={classes.creatoravatar}></img>
          </Grid>
          <Grid item>
            <Typography variant="overline" component="p">
              <Link href="/creator/[id]" as={`/creator/${course.creatorId}`}>
                <a>{course.creatorName}</a>
              </Link>
            </Typography>
            <Typography variant="overline" className={classes.updatedtime}>
              {formattedLocaleDate(course.updated)}
            </Typography>
          </Grid>
        </Grid>
      )}
      {course.featuredImage && (
        <div className={classes.featuredimagecontainer} />
      )}
      {options.showEnrollmentArea && !profile.purchases.includes(course.id) && (
        <div className={classes.enrollmentArea}>
          <Grid container direction="row" alignItems="center">
            <Grid item className={classes.enrollmentAreaPriceTag}>
              <PriceTag cost={course.cost} freeCostCaption={FREE_COST} />
            </Grid>
            <Grid>
              <BuyButton
                course={course}
                onTransactionSuccess={() => {}}
                onTransactionFailure={() => {}}
              />
            </Grid>
          </Grid>
        </div>
      )}
      {courseDescriptionHydrated && process.browser && (
        <TextEditor
          initialContentState={courseDescriptionHydrated}
          readOnly={true}
        />
      )}
    </article>
  );
};

Article.propTypes = {
  course: publicCourse.isRequired,
  options: PropTypes.shape({
    showAttribution: PropTypes.bool,
    showEnrollmentArea: PropTypes.bool,
  }).isRequired,
  profile: profileProps,
};

const mapStateToProps = (state) => ({
  profile: state.profile,
});

export default connect(mapStateToProps)(Article);
