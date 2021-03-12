import React from "react";
import {
  Grid,
  Typography,
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
} from "@material-ui/core";
import PropTypes from "prop-types";
import { addressProps, featuredCourse, siteInfoProps } from "../types.js";
import { makeStyles } from "@material-ui/styles";
import { connect } from "react-redux";
import { formulateMediaUrl } from "../lib/utils";
import { URL_EXTENTION_COURSES } from "../config/constants";
import { FREE_COST, FEATURED_SECTION_HEADER } from "../config/strings.js";
import Link from "next/link";

const useStyles = makeStyles((theme) => ({
  container: {
    marginBottom: theme.spacing(1),
    [theme.breakpoints.up("md")]: {
      marginBottom: theme.spacing(2),
    },
  },
  header: {
    marginTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
}));

const Hero = (props) => {
  const { featuredCourses, address } = props;
  const classes = useStyles();

  return featuredCourses.length ? (
    <div className={classes.container}>
      <Grid container className={classes.header}>
        <Grid item>
          <Typography variant="h2">{FEATURED_SECTION_HEADER}</Typography>
        </Grid>
      </Grid>
      <Grid container alignItems="center" justify="space-between" spacing={2}>
        {featuredCourses.map((course) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={course.id}>
            <Card className={classes.item}>
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
                        address.backend,
                        course.featuredImage,
                        false
                      ) || "/default.png"
                    }
                    className={classes.cardMedia}
                  />
                  <CardContent>
                    <Typography variant="h6" className={classes.textOverflow}>
                      {course.title}
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                      {course.cost > 0
                        ? `${props.siteInfo.currencyUnit || ""} ${course.cost}`
                        : FREE_COST}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Link>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  ) : (
    <></>
  );
};

Hero.propTypes = {
  featuredCourses: PropTypes.arrayOf(featuredCourse),
  siteInfo: siteInfoProps,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  siteInfo: state.siteinfo,
  address: state.address,
});

export default connect(mapStateToProps)(Hero);
