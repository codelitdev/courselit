import React, { useState } from "react";
import AppBar from "@material-ui/core/AppBar";
import CssBaseline from "@material-ui/core/CssBaseline";
import Divider from "@material-ui/core/Divider";
import Drawer from "@material-ui/core/Drawer";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { Menu } from "@material-ui/icons";
import { Toolbar, Typography, Grid } from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import AppToast from "../../AppToast.js";
import SessionButton from "../../SessionButton.js";
import {
  PAGE_HEADER_ALL_COURSES,
  PAGE_HEADER_ALL_POSTS
} from "../../../config/strings.js";
import Link from "next/link";
import Img from "../../Img.js";
import { connect } from "react-redux";
import { siteInfoProps } from "../../../types.js";

const drawerWidth = 240;

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex"
  },
  drawer: {
    [theme.breakpoints.up("sm")]: {
      width: drawerWidth,
      flexShrink: 0
    }
  },
  appBar: {
    marginLeft: drawerWidth,
    [theme.breakpoints.up("sm")]: {
      width: `calc(100% - ${drawerWidth}px)`
    }
  },
  menuButton: {
    marginRight: theme.spacing(2),
    [theme.breakpoints.up("sm")]: {
      display: "none"
    }
  },
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: drawerWidth
  },
  content: {
    flexGrow: 1
  },
  activeItem: {
    background: "#d6d6d6"
  },
  visitSiteLink: {
    color: "#fff"
  },
  logo: {
    display: "flex"
  },
  logocontainer: {
    width: "2em",
    height: "2em",
    marginRight: theme.spacing(1),
    display: "flex"
  },
  logoimg: {
    borderRadius: "0.2em"
  }
}));

const Scaffold = props => {
  const classes = useStyles();
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleDrawerToggle() {
    setMobileOpen(!mobileOpen);
  }

  const drawer = (
    <div>
      <div className={classes.toolbar} />
      <Divider />
      <List>
        <Link href="/courses">
          <ListItem button component="a">
            <ListItemText primary={PAGE_HEADER_ALL_COURSES}></ListItemText>
          </ListItem>
        </Link>
        <Link href="/posts">
          <ListItem button component="a">
            <ListItemText primary={PAGE_HEADER_ALL_POSTS}></ListItemText>
          </ListItem>
        </Link>
      </List>
    </div>
  );

  return (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            className={classes.menuButton}
          >
            <Menu />
          </IconButton>
          <Grid
            container
            justify="space-between"
            direction="row"
            alignItems="center"
          >
            <Grid item>
              <Grid container direction="row" alignItems="center">
                <Grid item>
                  <Link href="/">
                    <a className={classes.logo}>
                      <div className={classes.logocontainer}>
                        <Img
                          src={props.siteinfo.logopath}
                          isThumbnail={true}
                          classes={classes.logoimg}
                        />
                      </div>
                    </a>
                  </Link>
                </Grid>
                <Grid item>
                  <Typography variant="h5">{props.siteinfo.title}</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item>
              <SessionButton />
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
      <nav className={classes.drawer} aria-label="menu">
        {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
        <Hidden smUp implementation="css">
          <Drawer
            variant="temporary"
            anchor={theme.direction === "rtl" ? "right" : "left"}
            open={mobileOpen}
            onClose={handleDrawerToggle}
            classes={{
              paper: classes.drawerPaper
            }}
            ModalProps={{
              keepMounted: true // Better open performance on mobile.
            }}
          >
            {drawer}
          </Drawer>
        </Hidden>
        <Hidden xsDown implementation="css">
          <Drawer
            classes={{
              paper: classes.drawerPaper
            }}
            variant="permanent"
            open
          >
            {drawer}
          </Drawer>
        </Hidden>
      </nav>

      <main className={classes.content}>
        <div className={classes.toolbar} />
        {props.children}
      </main>
      <AppToast />
    </div>
  );
};

Scaffold.propTypes = {
  children: PropTypes.object,
  siteinfo: siteInfoProps
};

const mapStateToProps = state => ({
  siteinfo: state.siteinfo
});

export default connect(mapStateToProps)(Scaffold);
