import React from "react";
import {
  Grid,
  Typography,
  Card,
  CardActionArea,
  CardMedia,
  CardContent
} from "@material-ui/core";
import PropTypes from "prop-types";
import { featuredCourse, siteInfoProps } from "../types.js";
import { makeStyles } from "@material-ui/styles";
import { connect } from "react-redux";
import { formulateMediaUrl } from "../lib/utils";
import { MEDIA_BACKEND, URL_EXTENTION_COURSES } from "../config/constants";
import { FREE_COST, FEATURED_SECTION_HEADER } from "../config/strings.js";
import Link from "next/link";

const useStyles = makeStyles(theme => ({
  container: {
    marginBottom: theme.spacing(1),
    [theme.breakpoints.up("md")]: {
      marginBottom: theme.spacing(2)
    }
  },
  coursesContainer: {
    marginBottom: theme.spacing(1)
  },
  content: {
    display: "flex",
    flex: 1,
    overflow: "auto",
    paddingBottom: theme.spacing(2)
  },
  elem: {
    width: 200,
    padding: 80,
    border: "1px solid black"
  },
  header: {
    marginTop: theme.spacing(2),
    paddingBottom: theme.spacing(2)
  },
  item: {
    float: "left",
    flex: "0 0 40vw",
    [theme.breakpoints.up("md")]: {
      flex: "0 0 24vw"
    },
    marginRight: theme.spacing(4)
  }
}));

const Hero = props => {
  const { featuredCourses } = props;
  const classes = useStyles();

  return featuredCourses.length ? (
    <div className={classes.container}>
      <Grid container className={classes.header}>
        <Grid item>
          <Typography variant="h4">{FEATURED_SECTION_HEADER}</Typography>
        </Grid>
      </Grid>
      <Grid container alignItems="center">
        <Grid item className={classes.content}>
          {featuredCourses.map(course => (
            <Card className={classes.item} key={course.id}>
              <Link
                href={`/${URL_EXTENTION_COURSES}/[id]/[slug]`}
                as={`/${URL_EXTENTION_COURSES}/${course.id}/${course.slug}`}
              >
                <CardActionArea>
                  <CardMedia
                    component="img"
                    alt={course.title}
                    title={course.title}
                    image={
                      formulateMediaUrl(
                        MEDIA_BACKEND,
                        course.featuredImage,
                        false
                      ) || "/default.png"
                    }
                    className={classes.cardMedia}
                  />
                  <CardContent>
                    <Typography variant="h6">{course.title}</Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                      {course.cost > 0
                        ? `${props.siteInfo.currencyUnit || ""} ${course.cost}`
                        : FREE_COST}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Link>
            </Card>
          ))}
        </Grid>
      </Grid>
    </div>
  ) : (
    <></>
  );
};

Hero.propTypes = {
  featuredCourses: PropTypes.arrayOf(featuredCourse),
  siteInfo: siteInfoProps
};

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
});

export default connect(mapStateToProps)(Hero);
