import React, { useState } from "react";
import { Grid, IconButton, Typography, Button, Card, CardActionArea, CardMedia, CardContent } from "@material-ui/core";
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
    listStyle: 'none',
    margin: 0,
    padding: 0,
    overflowX: 'auto',
    overflowY: 'none',
    display: 'flex',
    marginBottom: theme.spacing(2),
    paddingBottom: theme.spacing(1)
  },
  header: {
    marginBottom: theme.spacing(2)
  },
  item: {
    float: 'left',
    flex: '0 0 70vw',
    [theme.breakpoints.up('md')]: {
      flex: '0 0 40vw',
    },
    marginRight: theme.spacing(4)
  },
}))

const Hero = props => {
  const { featuredCourses } = props;
  const classes = useStyles();

  return (
    <>{featuredCourses.length > 0 && <Grid container>
      <Grid item className={classes.header}>
        <Typography variant='h2'>
          {FEATURED_SECTION_HEADER}
        </Typography>
      </Grid>
      <Grid item className={classes.body}>
        <ul
          className={classes.container}
        >
          {featuredCourses.map(course => (
            <li className={classes.item}>
              <Card className={classes.card}>
                <Link
                  href={`/${URL_EXTENTION_COURSES}/[id]/[slug]`}
                  as={`/${URL_EXTENTION_COURSES}/${course.id}/${course.slug}`}
                >
                  <CardActionArea>
                    <CardMedia
                      component='img'
                      alt={course.title}
                      title={course.title}
                      image={formulateMediaUrl(MEDIA_BACKEND, course.featuredImage, false) || "/default.png"}
                      className={classes.cardMedia}
                    />
                    <CardContent>
                      <Typography variant='h3'>
                        {course.title}
                      </Typography>
                      <Typography variant='body1' color="textSecondary">
                        {course.cost > 0
                          ? `${props.siteInfo.currencyUnit || ""} ${course.cost}`
                          : FREE_COST}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      </Grid>
    </Grid>}
    {!featuredCourses.length <= 0 && <></>}
    </>
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
