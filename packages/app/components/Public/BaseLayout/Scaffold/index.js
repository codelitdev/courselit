import React, { useState } from "react";
import AppBar from "@material-ui/core/AppBar";
import CssBaseline from "@material-ui/core/CssBaseline";
import Drawer from "@material-ui/core/Drawer";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import { Menu } from "@material-ui/icons";
import { LinearProgress, Toolbar } from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import AppToast from "../../../AppToast.js";
import { connect } from "react-redux";
import { siteInfoProps, link, profileProps } from "../../../../types.js";
import Header from "../Header.js";
import dynamic from "next/dynamic";

const DrawerContent = dynamic(() => import("./DrawerContent"));

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
  appBar: Object.assign(
    {},
    {
      zIndex: theme.zIndex.drawer + 1,
      [theme.breakpoints.up("sm")]: {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: drawerWidth,
      },
    },
    theme.appBar
  ),
  menuButton: {
    [theme.breakpoints.up("sm")]: {
      display: "none",
    },
  },
  toolbar: theme.mixins.toolbar,
  drawerPaper: Object.assign(
    {},
    {
      width: drawerWidth,
    },
    {},
    theme.drawer
  ),
  content: {
    flexGrow: 1,
  },
  showProgressBar: (props) => ({
    visibility: props.networkAction ? "visible" : "hidden",
  }),
  menuTitle: {
    marginLeft: theme.spacing(2),
  },
}));

const Scaffold = (props) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const classes = useStyles(props);
  const theme = useTheme();

  function handleDrawerToggle() {
    setMobileOpen(!mobileOpen);
  }

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
            <DrawerContent
              handleDrawerToggle={handleDrawerToggle}
              forMobile={true}
            />
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
            <DrawerContent handleDrawerToggle={handleDrawerToggle} />
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
