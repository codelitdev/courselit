import React from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { URL_EXTENTION_POSTS } from "../../../config/constants.js";
import { Grid, Typography, Card, CardContent } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import Img from "../../Img.js";

const useStyles = makeStyles({
  featuredimagecontainer: {
    display: "flex"
  },
  bloglink: {
    textDecoration: "none",
    display: "block",
    marginTop: "0.8em",
    marginBottom: "1em",
    "&:hover": {
      background: "#eee"
    },
    color: "inherit"
  }
});

const ListItem = props => {
  const classes = useStyles();

  return (
    <Link
      href={`/${URL_EXTENTION_POSTS}/[id]/[slug]`}
      as={`/${URL_EXTENTION_POSTS}/${props.id}/${props.slug}`}
    >
      <a className={classes.bloglink}>
        <Card>
          <CardContent>
            <article>
              <Grid container direction="row" spacing={2}>
                {props.featuredImage && (
                  <Grid
                    item
                    className={classes.featuredimagecontainer}
                    sm={12}
                    md={2}
                  >
                    <Img src={props.featuredImage} />
                  </Grid>
                )}
                <Grid item sm={12} md={10}>
                  <Grid container direction="column">
                    <Grid item>
                      <Typography variant="h6" className="title">
                        {props.title}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant="body1" color="textSecondary">
                        {props.description}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </article>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
};

ListItem.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  updated: PropTypes.string.isRequired,
  creatorName: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired,
  featuredImage: PropTypes.string
};

export default ListItem;
