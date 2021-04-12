import React from "react";
import { Typography, Grid, Divider } from "@material-ui/core";
import Link from "next/link";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/styles";
import { formattedLocaleDate, checkPermission } from "../../lib/utils";
import { publicCourse, profileProps } from "../../types";
import { connect } from "react-redux";
import {
  PriceTag,
  RichText as TextEditor,
  Section,
} from "@courselit/components-library";
import { FREE_COST } from "../../config/strings.js";
import dynamic from "next/dynamic";
import { permissions } from "../../config/constants";

const BuyButton = dynamic(() => import("../CheckoutExternal"));
const Img = dynamic(() => import("../Img"));

const useStyles = makeStyles((theme) => ({
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
  enrollmentArea: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(4),
  },
  enrollmentAreaPriceTag: {},
  content: {
    marginTop: theme.spacing(4),
  },
}));

const Article = (props) => {
  const { course, options, profile } = props;
  const classes = useStyles();
  let courseDescriptionHydrated;
  try {
    courseDescriptionHydrated = TextEditor.hydrate({
      data: course.description,
    });
  } catch (err) {}

  return (
    <Section>
      <article>
        <header>
          <Typography variant="h2" className={classes.header}>
            {course.title}
          </Typography>
        </header>
        {options.showAttribution && (
          <Grid
            container
            className={classes.creatorcard}
            direction="column"
            spacing={2}
          >
            <Grid item>
              <Divider />
            </Grid>
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
            <Grid item>
              <Divider />
            </Grid>
          </Grid>
        )}
        {course.featuredImage && <Img src={course.featuredImage} />}
        {options.showEnrollmentArea &&
          (profile.fetched
            ? !profile.purchases.includes(course.id) &&
              checkPermission(profile.permissions, [permissions.enrollInCourse])
            : true) && (
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
    </Section>
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
