import React from "react";
import { styled } from "@mui/material/styles";
import { Typography, Grid, Divider } from "@mui/material";
import Link from "next/link";
import PropTypes from "prop-types";
import { formattedLocaleDate, checkPermission } from "../../lib/utils";
import { publicCourse, profileProps } from "../../types";
import { connect } from "react-redux";
import {
  PriceTag,
  RichText as TextEditor,
  Section,
} from "../ComponentsLibrary";
import { FREE_COST } from "../../config/strings.js";
import dynamic from "next/dynamic";
import { permissions } from "../../config/constants";

const PREFIX = "Article";

const classes = {
  header: `${PREFIX}-header`,
  creatoravatarcontainer: `${PREFIX}-creatoravatarcontainer`,
  creatorcard: `${PREFIX}-creatorcard`,
  creatoravatar: `${PREFIX}-creatoravatar`,
  creatorName: `${PREFIX}-creatorName`,
  enrollmentArea: `${PREFIX}-enrollmentArea`,
  enrollmentAreaPriceTag: `${PREFIX}-enrollmentAreaPriceTag`,
  content: `${PREFIX}-content`,
};

const StyledSection = styled(Section)(({ theme }) => ({
  [`& .${classes.header}`]: {},

  [`& .${classes.creatoravatarcontainer}`]: {
    display: "flex",
    alignItems: "center",
  },

  [`& .${classes.creatorcard}`]: {
    marginTop: theme.spacing(1),
  },

  [`& .${classes.creatoravatar}`]: {
    borderRadius: "1.5em",
    width: "3em",
    marginRight: "1em",
  },

  [`& .${classes.creatorName}`]: {
    color: "inherit",
  },

  [`& .${classes.enrollmentArea}`]: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(4),
  },

  [`& .${classes.enrollmentAreaPriceTag}`]: {},

  [`& .${classes.content}`]: {
    marginTop: theme.spacing(4),
  },
}));

const BuyButton = dynamic(() => import("../CheckoutExternal"));
const Img = dynamic(() => import("../Img"));

const Article = (props) => {
  const { course, options, profile } = props;

  let courseDescriptionHydrated;
  try {
    courseDescriptionHydrated = TextEditor.hydrate({
      data: course.description,
    });
  } catch (err) {}

  return (
    <StyledSection>
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
        {course.featuredImage && (
          <Img
            alt={course.featuredImage.caption}
            src={course.featuredImage.file}
          />
        )}
        {options.showEnrollmentArea &&
          (profile.fetched
            ? !profile.purchases.includes(course.id) &&
              checkPermission(profile.permissions, [permissions.enrollInCourse])
            : true) && (
            <div className={classes.enrollmentArea}>
              <Grid
                container
                direction="row"
                justifyContent="space-between"
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
    </StyledSection>
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
