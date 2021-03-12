import React from "react";
import { Typography, Grid } from "@material-ui/core";
import Link from "next/link";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/styles";
import { formulateMediaUrl, formattedLocaleDate } from "../../lib/utils";
import { publicCourse, profileProps, addressProps } from "../../types";
import BuyButton from "../CheckoutExternal";
import { connect } from "react-redux";
import {
  PriceTag,
  RichText as TextEditor,
} from "@courselit/components-library";
import { FREE_COST } from "../../config/strings.js";

const useStyles = ({ featuredImage, backendUrl }) =>
  makeStyles((theme) => ({
    header: {},
    creatoravatarcontainer: {
      display: "flex",
      alignItems: "center",
    },
    creatorcard: {
      marginTop: theme.spacing(1),
    },
    creatoravatar: {
      borderRadius: "1.5em",
      width: "3em",
      marginRight: "1em",
    },
    creatorName: {
      color: "inherit",
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
        backendUrl,
        featuredImage
      )}') no-repeat center center`,
      backgroundSize: "contain",
    },
    enrollmentArea: {
      marginTop: theme.spacing(3),
      marginBottom: theme.spacing(4),
    },
    enrollmentAreaPriceTag: {
      // marginRight: theme.spacing(2),
      // marginBottom: theme.spacing(2),
    },
    content: {
      marginTop: theme.spacing(4),
    },
  }));

const Article = (props) => {
  const { course, options, profile, address } = props;
  const classes = useStyles({
    featuredImage: course.featuredImage,
    backendUrl: address.backend,
  })();
  let courseDescriptionHydrated;
  try {
    courseDescriptionHydrated = TextEditor.hydrate({
      data: course.description,
    });
  } catch (err) {}

  return (
    <article>
      <header>
        <Typography variant="h1" className={classes.header}>
          {course.title}
        </Typography>
      </header>
      {options.showAttribution && (
        <Grid container className={classes.creatorcard}>
          <Grid item>
            <Typography variant="overline" component="p">
              <Link href="/profile/[id]" as={`/profile/${course.creatorId}`}>
                <a className={classes.creatorName}>{course.creatorName}</a>
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
          <Grid
            container
            direction="row"
            justify="space-between"
            alignItems="center"
          >
            <Grid item className={classes.enrollmentAreaPriceTag}>
              <PriceTag cost={course.cost} freeCostCaption={FREE_COST} />
            </Grid>
            <Grid>
              <BuyButton course={course} />
            </Grid>
          </Grid>
        </div>
      )}
      {courseDescriptionHydrated && process.browser && (
        <div className={classes.content}>
          <TextEditor
            initialContentState={courseDescriptionHydrated}
            readOnly={true}
          />
        </div>
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
  address: addressProps,
};

const mapStateToProps = (state) => ({
  profile: state.profile,
  address: state.address,
});

export default connect(mapStateToProps)(Article);
