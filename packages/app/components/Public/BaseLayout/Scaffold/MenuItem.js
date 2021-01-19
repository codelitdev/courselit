import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/styles";
import { ListItem, ListItemText, ListItemIcon } from "@material-ui/core";
import { OpenInNew } from "@material-ui/icons";
import Link from "next/link";
import { link } from "../../../../types";

const useStyles = makeStyles({
  externalLink: {
    textDecoration: "none",
    color: "inherit",
    display: "block",
  },
});

const MenuItem = (props) => {
  const { link } = props;
  const classes = useStyles();

  return link.destination.indexOf("http") !== -1 || link.newTab ? (
    <a
      href={link.destination}
      key={link.text}
      target="_blank"
      rel="noreferrer noopener"
      className={classes.externalLink}
      onClick={props.closeDrawer ? props.closeDrawer : () => {}}
    >
      <ListItem button>
        <ListItemText primary={link.text}></ListItemText>
        {link.newTab && (
          <ListItemIcon>
            <OpenInNew />
          </ListItemIcon>
        )}
      </ListItem>
    </a>
  ) : (
    <Link href={link.destination} key={link.text}>
      <ListItem
        button
        component="a"
        onClick={props.closeDrawer ? props.closeDrawer : () => {}}
      >
        <ListItemText primary={link.text}></ListItemText>
      </ListItem>
    </Link>
  );
};

MenuItem.propTypes = {
  link: link,
  closeDrawer: PropTypes.func,
};

export default MenuItem;
