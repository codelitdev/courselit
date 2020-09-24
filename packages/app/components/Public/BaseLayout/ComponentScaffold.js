import React, { useState, useEffect } from "react";
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
import { Toolbar, Grid, LinearProgress } from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import AppToast from "../../AppToast";
import DrawerListItemIcon from "./DrawerListItemIcon.js";
import Footer from "./Footer.js";
import Header from "./Header.js";
import { connect } from "react-redux";

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
    marginLeft: drawerWidth,
    [theme.breakpoints.up("sm")]: {
      width: `calc(100% - ${drawerWidth}px)`,
    },
  },
  menuButton: {
    marginRight: theme.spacing(2),
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
  contentMain: {
    padding: theme.spacing(2),
    paddingTop: theme.spacing(8),
    minHeight: "80vh",
  },
  showProgressBar: (props) => ({
    visibility: props.networkAction ? "visible" : "hidden",
  }),
}));

const ComponentScaffold = (props) => {
  const classes = useStyles(props);
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visibleComponent, setVisibleComponent] = useState();
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  useEffect(() => {
    showComponent(props.items[0].element);
  }, []);

  function handleDrawerToggle() {
    setMobileOpen(!mobileOpen);
  }

  function showComponent(item, index) {
    setActiveItemIndex(index);
    setVisibleComponent(item);
  }

  const drawer = (
    <div>
      <div className={classes.toolbar} />
      <Divider />
      <List>
        {props.items.map((item, index) => (
          <ListItem
            button
            key={index}
            onClick={() => showComponent(item.element, index)}
            className={activeItemIndex === index ? classes.activeItem : null}
          >
            <Grid container direction="row" alignItems="center">
              {item.icon && !item.iconPlacementRight && (
                <DrawerListItemIcon icon={item.icon} />
              )}
              <Grid item>
                <ListItemText primary={item.name} />
              </Grid>
              {item.icon && item.iconPlacementRight && (
                <DrawerListItemIcon icon={item.icon} />
              )}
            </Grid>
          </ListItem>
        ))}
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
            {drawer}
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
            {drawer}
          </Drawer>
        </Hidden>
      </nav>
      <main className={classes.content}>
        <div className={classes.toolbar} />
        <LinearProgress className={classes.showProgressBar} />
        <Grid container className={classes.contentMain}>
          <Grid item xs={12}>
            {visibleComponent}
          </Grid>
        </Grid>
        <Footer />
      </main>
      <AppToast />
    </div>
  );
};

ComponentScaffold.propTypes = {
  pageTitle: PropTypes.string,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      element: PropTypes.object.isRequired,
      icon: PropTypes.object,
      props: PropTypes.object,
      progress: PropTypes.shape({
        status: PropTypes.bool.isRequired,
      }),
    })
  ),
  networkAction: PropTypes.bool.isRequired,
};

const mapStateToProps = (state) => ({
  networkAction: state.networkAction,
});

export default connect(mapStateToProps)(ComponentScaffold);
