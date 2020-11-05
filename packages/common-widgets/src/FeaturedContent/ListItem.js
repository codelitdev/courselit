import React from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";

const useStyles = ({featuredImage, utilities, config}) =>
  makeStyles((theme) => ({
    link: {
      textDecoration: "none",
      color: "inherit",
      marginBottom: theme.spacing(4),
      display: "block",
    },
    featuredImage: {
      height: 360,
      width: "100%",
      background: `url('${utilities.formulateMediaUrl(
        config.MEDIA_BACKEND,
        featuredImage
      )}') no-repeat center center`,
      backgroundSize: "cover",
    },
    title: {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(0.5),
    },
    card: {
      padding: theme.spacing(2),
      border: "1px solid transparent",
      borderRadius: 1,
      "&:hover": {
        border: "1px solid #cccccc",
        cursor: "pointer",
      },
    },
  }));

const ListItem = (props) => {
  const { appUtilities, appConfig } = props;
  const classes = useStyles({
    featuredImage: props.featuredImage,
    utilities: appUtilities,
    config: appConfig
  })();

  return (
    <Grid item xs={12} md={4}>
      <Link
        href={`/${appConfig.URL_EXTENTION_COURSES}/[id]/[slug]`}
        as={`/${appConfig.URL_EXTENTION_COURSES}/${props.courseId}/${props.slug}`}
      >
        <a className={classes.link}>
          <div className={classes.card}>
            <Grid item container direction="column" component="article">
              {props.featuredImage && (
                <Grid item className={classes.featuredImage} />
              )}
              <Grid
                item
                container
                className={classes.title}
                justify="space-between"
                alignItems="center"
              >
                <Grid item>
                  <Typography variant="h5">{props.title}</Typography>
                </Grid>
                <Grid item>
                  <Typography variant="h6">
                    {/* <PriceTag cost={props.cost}></PriceTag> */}
                    {props.cost}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </div>
        </a>
      </Link>
    </Grid>
  );
};

ListItem.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  updated: PropTypes.string.isRequired,
  creatorName: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired,
  featuredImage: PropTypes.string,
  cost: PropTypes.number.isRequired,
  courseId: PropTypes.number.isRequired,
  appConfig: PropTypes.object.isRequired,
  appUtilities: PropTypes.object.isRequired
};

export default ListItem;
