import React, { useState } from "react";
import AppBar from "@material-ui/core/AppBar";
import CssBaseline from "@material-ui/core/CssBaseline";
import Divider from "@material-ui/core/Divider";
import Drawer from "@material-ui/core/Drawer";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import { Menu } from "@material-ui/icons";
import { Grid, LinearProgress, Toolbar, Typography } from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import AppToast from "../../../AppToast.js";
import { connect } from "react-redux";
import { siteInfoProps, link, profileProps } from "../../../../types.js";
import Header from "../Header.js";
import {
  MAIN_MENU_ITEM_DASHBOARD,
  MAIN_MENU_ITEM_PROFILE,
} from "../../../../config/strings.js";
import { NAVIGATION_CATEGORY_MAIN } from "../../../../config/constants.js";
import MenuItem from "./MenuItem.js";

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  drawer: {
    [theme.breakpoints.up("sm")]: {
      width: drawerWidth,
      flexShrink: 0,
    },
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
  },
  menuButton: {
    [theme.breakpoints.up("sm")]: {
      display: "none",
    },
  },
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: drawerWidth,
  },
  content: {
    flexGrow: 1,
  },
  activeItem: {
    background: "#d6d6d6",
  },
  visitSiteLink: {
    color: "#fff",
  },
  showProgressBar: (props) => ({
    visibility: props.networkAction ? "visible" : "hidden",
  }),
  menuTitle: {
    marginLeft: theme.spacing(2),
  },
}));

const Scaffold = (props) => {
  const classes = useStyles(props);
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleDrawerToggle() {
    setMobileOpen(!mobileOpen);
  }

  const makeDrawer = (forMobile = false) => (
    <div>
      <Grid container alignItems="center" className={classes.toolbar}>
        <Grid item className={classes.menuTitle}>
          <Typography variant="h5">{props.siteinfo.title}</Typography>
        </Grid>
      </Grid>
      <Divider />
      <List>
        {props.profile.fetched && (
          <>
            {props.profile.id && (
              <>
                <MenuItem
                  link={{
                    text: MAIN_MENU_ITEM_PROFILE,
                    destination: `/profile/${
                      props.profile.userId && props.profile.userId !== -1
                        ? props.profile.userId
                        : props.profile.id
                    }`,
                    category: NAVIGATION_CATEGORY_MAIN,
                    newTab: false,
                  }}
                />
                <Divider />
              </>
            )}
            {(props.profile.isAdmin || props.profile.isCreator) && (
              <MenuItem
                link={{
                  text: MAIN_MENU_ITEM_DASHBOARD,
                  destination: "/dashboard",
                  category: NAVIGATION_CATEGORY_MAIN,
                  newTab: false,
                }}
              />
            )}
          </>
        )}
        {props.navigation &&
          props.navigation.map((link) =>
            forMobile ? (
              <MenuItem
                link={link}
                key={link.destination}
                closeDrawer={handleDrawerToggle}
              />
            ) : (
              <MenuItem link={link} key={link.destination} />
            )
          )}
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
          <Header />
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
              paper: classes.drawerPaper,
            }}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
          >
            {makeDrawer(true)}
          </Drawer>
        </Hidden>
        <Hidden xsDown implementation="css">
          <Drawer
            classes={{
              paper: classes.drawerPaper,
            }}
            variant="permanent"
            open
          >
            {makeDrawer()}
          </Drawer>
        </Hidden>
      </nav>

      <main className={classes.content}>
        <div className={classes.toolbar} />
        <LinearProgress className={classes.showProgressBar} />
        {props.children}
      </main>
      <AppToast />
    </div>
  );
};

Scaffold.propTypes = {
  children: PropTypes.object,
  siteinfo: siteInfoProps,
  navigation: PropTypes.arrayOf(link),
  networkAction: PropTypes.bool.isRequired,
  profile: profileProps,
};

const mapStateToProps = (state) => ({
  siteinfo: state.siteinfo,
  navigation: state.navigation.filter((link) => link.category === "main"),
  networkAction: state.networkAction,
  profile: state.profile,
});

export default connect(mapStateToProps)(Scaffold);
