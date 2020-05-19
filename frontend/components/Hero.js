import React, { useState } from "react";
import { Grid, IconButton, Typography, Button, Card, CardActionArea, CardMedia, CardContent } from "@material-ui/core";
import PropTypes from "prop-types";
import { featuredCourse, siteInfoProps } from "../types.js";
import { makeStyles } from "@material-ui/styles";
import { connect } from "react-redux";
import { KeyboardArrowLeft, KeyboardArrowRight } from "@material-ui/icons";

import { formulateMediaUrl } from "../lib/utils";
import { MEDIA_BACKEND, URL_EXTENTION_COURSES } from "../config/constants";
import { FREE_COST } from "../config/strings.js";
import Link from "next/link";

// const getUseStyles = backgroundImageUrl =>
//   makeStyles(theme => ({
//     container: {
//       background: `url('${formulateMediaUrl(
//         MEDIA_BACKEND,
//         backgroundImageUrl,
//         false
//       )}') no-repeat center center`,
//       backgroundSize: "cover"
//     },
//     contentContainer: {
//       padding: "12em 2em",
//       [theme.breakpoints.down("sm")]: {
//         padding: "7em 0em"
//       }
//     },
//     title: {
//       marginBottom: "2em",
//       margin: "0.8em 0em",
//       textAlign: "center"
//     }
//   }));

const useStyles = makeStyles(theme => ({
  container: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    overflowX: 'scroll',
    overflowY: 'none',
    width: '100%'
  },
  item: {
    float: 'right'
  },
  card: {
    maxWidth: 300,
    [theme.breakpoints.up('md')]: {
      maxWidth: 420
    },
    marginRight: '2em'
  }
}))

const Hero = props => {
  const [offset, setOffset] = useState(0);
  const { featuredCourses } = props;
  const item = featuredCourses[offset];
  if (!item) return <></>;
  const classes = useStyles();

  // const classes = getUseStyles(item.featuredImage)();
  const cost =
    item.cost > 0
      ? `${props.siteInfo.currencyUnit || ""} ${item.cost}`
      : FREE_COST;

  // const showNextItem = () =>
  //   setOffset(offset + 1 === featuredCourses.length ? offset : offset + 1);
  // const showPreviousItem = () => setOffset(offset - 1 < 0 ? 0 : offset - 1);

  return (
    <ul
      className={classes.container}
    >
      {/* <Grid item container direction="row" justify="flex-start" xs={1}>
        <Grid item>
          <IconButton aria-label="previous" onClick={showPreviousItem}>
            <KeyboardArrowLeft />
          </IconButton>
        </Grid>
      </Grid>

      <Grid item xs={10}>
        <Grid
          container
          direction="column"
          justify="center"
          alignItems="center"
          className={classes.contentContainer}
        >
          <Grid item className={classes.title}>
            <Typography variant="h2">{item.title}</Typography>
          </Grid>
          <Grid item>
            <Typography variant="h4">
              <Link
                href={`/${URL_EXTENTION_COURSES}/[id]/[slug]`}
                as={`/${URL_EXTENTION_COURSES}/${item.id}/${item.slug}`}
              >
                <Button variant="contained" color="secondary">
                  Enroll for {cost}
                </Button>
              </Link>
            </Typography>
          </Grid>
        </Grid>
      </Grid>

      <Grid item container direction="row" justify="flex-end" xs={1}>
        <Grid item>
          <IconButton aria-label="previous" onClick={showNextItem}>
            <KeyboardArrowRight />
          </IconButton>
        </Grid>
      </Grid> */}
      {featuredCourses.map(course => (
        <li className={classes.item}>
          <Card className={classes.card}>
            <Link
              href={`/${URL_EXTENTION_COURSES}/[id]/[slug]`}
              as={`/${URL_EXTENTION_COURSES}/${item.id}/${item.slug}`}
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
                    {cost}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Link>
          </Card>
        </li>
      ))}
    </ul>
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
