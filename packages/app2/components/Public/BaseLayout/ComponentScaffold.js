import React, { useState, useEffect } from "react";
import { styled } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import CssBaseline from "@mui/material/CssBaseline";
import Drawer from "@mui/material/Drawer";
import Hidden from "@mui/material/Hidden";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import { Menu } from "@mui/icons-material";
import {
  Toolbar,
  Grid,
  LinearProgress,
  ListSubheader,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PropTypes from "prop-types";
import AppToast from "../../AppToast";
import DrawerListItemIcon from "./DrawerListItemIcon.js";
import Header from "./Header.js";
import { connect } from "react-redux";
import { siteInfoProps } from "../../../types";
import useMediaQuery from "@mui/material/useMediaQuery";
import dynamic from "next/dynamic";

const PREFIX = "ComponentScaffold";

const classes = {
  root: `${PREFIX}-root`,
  drawer: `${PREFIX}-drawer`,
  appBar: `${PREFIX}-appBar`,
  menuButton: `${PREFIX}-menuButton`,
  toolbar: `${PREFIX}-toolbar`,
  drawerPaper: `${PREFIX}-drawerPaper`,
  content: `${PREFIX}-content`,
  activeItem: `${PREFIX}-activeItem`,
  visitSiteLink: `${PREFIX}-visitSiteLink`,
  contentMain: `${PREFIX}-contentMain`,
  contentPadding: `${PREFIX}-contentPadding`,
  showProgressBar: `${PREFIX}-showProgressBar`,
  menuTitle: `${PREFIX}-menuTitle`,
  branding: `${PREFIX}-branding`,
  subheader: `${PREFIX}-subheader`,
};

const Root = styled("div")(({ theme }) => ({
  [`& .${classes.root}`]: {
    display: "flex",
  },

  [`& .${classes.drawer}`]: {
    [theme.breakpoints.up("sm")]: {
      width: drawerWidth,
      flexShrink: 0,
    },
  },

  [`& .${classes.appBar}`]: Object.assign(
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

  [`& .${classes.menuButton}`]: {
    [theme.breakpoints.up("sm")]: {
      display: "none",
    },
  },

  [`& .${classes.toolbar}`]: theme.mixins.toolbar,

  [`& .${classes.drawerPaper}`]: Object.assign(
    {},
    {
      width: drawerWidth,
    },
    {},
    theme.drawer
  ),

  [`& .${classes.content}`]: {
    flexGrow: 1,
  },

  [`& .${classes.activeItem}`]: {
    background: "#d6d6d6",
  },

  [`& .${classes.visitSiteLink}`]: {
    color: "#fff",
  },

  [`& .${classes.contentMain}`]: Object.assign(
    {},
    {
      // maxWidth: 1240,
      minHeight: "80vh",
      margin: "0 auto",
    },
    theme.body
  ),

  [`& .${classes.contentPadding}`]: {
    padding: theme.spacing(2),
  },

  [`& .${classes.showProgressBar}`]: (props) => ({
    visibility: props.networkAction ? "visible" : "hidden",
  }),

  [`& .${classes.menuTitle}`]: {
    marginLeft: theme.spacing(2),
  },

  [`&.${classes.branding}`]: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },

  [`& .${classes.subheader}`]: {
    marginTop: theme.spacing(3),
  },
}));

const Branding = dynamic(() => import("./Branding"));

const drawerWidth = 240;

const ComponentScaffold = (props) => {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visibleComponent, setVisibleComponent] = useState();
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const matches = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const [firstLoad, setFirstLoad] = useState(false);

  useEffect(() => {
    showComponent(props.items[0].element);
    setFirstLoad(true);
  }, []);

  useEffect(() => {
    if (firstLoad && matches) {
      setMobileOpen(true);
    }
  }, [firstLoad]);

  function handleDrawerToggle() {
    setMobileOpen(!mobileOpen);
  }

  function showComponent(item, index) {
    setActiveItemIndex(index);
    setVisibleComponent(item);
  }

  const drawer = (
    <>
      <Root className={classes.branding}>
        <Branding />
      </Root>

      <List>
        {props.items.map((item, index) =>
          item.element ? (
            <ListItem
              button
              key={index}
              onClick={() => showComponent(item.element, index)}
              className={activeItemIndex === index ? classes.activeItem : null}
            >
              <Grid
                container
                direction="row"
                alignItems="center"
                justifyContent={
                  item.icon && item.iconPlacementRight
                    ? "space-between"
                    : "flex-start"
                }
              >
                {item.icon && !item.iconPlacementRight && (
                  <DrawerListItemIcon icon={item.icon} />
                )}
                <Grid item>
                  <Typography variant="subtitle2">{item.name}</Typography>
                </Grid>
                {item.icon && item.iconPlacementRight && (
                  <DrawerListItemIcon icon={item.icon} right={true} />
                )}
              </Grid>
            </ListItem>
          ) : (
            <ListSubheader className={classes.subheader}>
              {item.name}
            </ListSubheader>
          )
        )}
      </List>
    </>
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
            size="large"
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
        <Hidden smDown implementation="css">
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
        <Grid container className={classes.contentPadding}>
          <Grid item xs={12} className={classes.contentMain}>
            {visibleComponent}
          </Grid>
        </Grid>
      </main>
      <AppToast />
    </div>
  );
};

ComponentScaffold.propTypes = {
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
  siteinfo: siteInfoProps,
};

const mapStateToProps = (state) => ({
  networkAction: state.networkAction,
  siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(ComponentScaffold);
