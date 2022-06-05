import React, { useState /* useEffect */ } from "react";
import { styled } from "@mui/system";
import AppBar from "@mui/material/AppBar";
import CssBaseline from "@mui/material/CssBaseline";
import Drawer from "@mui/material/Drawer";
import Hidden from "@mui/material/Hidden";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import { Menu } from "@mui/icons-material";
import { Toolbar, Grid, LinearProgress, Typography } from "@mui/material";
import { useTheme } from "@mui/material";
import AppToast from "../../app-toast";
import DrawerListItemIcon from "./drawer-list-item-icon";
import Header from "./header";
import { connect } from "react-redux";
// import useMediaQuery from "@mui/material/useMediaQuery";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import State from "../../../ui-models/state";

const PREFIX = "RouteBasedComponentScaffold";
const drawerWidth = 240;

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
    showprogress: `${PREFIX}-showprogress`,
    hideprogress: `${PREFIX}-hideprogress`,
    menuTitle: `${PREFIX}-menuTitle`,
    branding: `${PREFIX}-branding`,
};

const Root = styled("div")(({ theme }: { theme: any }) => ({
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
        [theme.breakpoints.up("sm")]: {
            width: `calc(100% - ${drawerWidth}px)`,
            marginLeft: drawerWidth,
        },
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

    [`& .${classes.hideprogress}`]: {
        visibility: "hidden",
    },

    [`& .${classes.showprogress}`]: {
        visibility: "visible",
    },

    [`& .${classes.menuTitle}`]: {
        marginLeft: theme.spacing(2),
    },

    [`&.${classes.branding}`]: {
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
    },
}));

const Branding = dynamic(() => import("./branding"));

const ComponentScaffold = (props: any) => {
    const theme = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);
    // const matches = useMediaQuery((theme) => theme.breakpoints.down("xs"));
    // const [firstLoad, setFirstLoad] = useState(false);
    const router = useRouter();

    // useEffect(() => {
    //   setFirstLoad(true);
    // }, []);

    // useEffect(() => {
    //   if (firstLoad && matches) {
    //     setMobileOpen(true);
    //   }
    // }, [firstLoad]);

    function handleDrawerToggle() {
        setMobileOpen(!mobileOpen);
    }

    function navigateTo(route: string) {
        router.push(route);
    }

    const drawer = (
        <>
            <Branding />

            <List>
                {props.items.map(
                    (item: Record<string, unknown>, index: number) => (
                        <ListItem
                            button
                            key={index}
                            onClick={() => navigateTo(item.route as string)}
                            className={
                                router.pathname === item.route
                                    ? classes.activeItem
                                    : null
                            }
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
                                    <DrawerListItemIcon
                                        icon={item.icon as object}
                                    />
                                )}
                                <Grid item>
                                    <Typography variant="subtitle2">
                                        {item.name as string}
                                    </Typography>
                                    {/* <ListItemText primary={item.name} /> */}
                                </Grid>
                                {item.icon && item.iconPlacementRight && (
                                    <DrawerListItemIcon
                                        icon={item.icon as object}
                                        right={true}
                                    />
                                )}
                            </Grid>
                        </ListItem>
                    )
                )}
            </List>
        </>
    );

    return (
        <Root>
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
                <LinearProgress
                    className={
                        props.networkAction
                            ? classes.showprogress
                            : classes.hideprogress
                    }
                />
                <Grid container className={classes.contentPadding}>
                    <Grid item xs={12} className={classes.contentMain}>
                        {props.children}
                    </Grid>
                </Grid>
            </main>
            <AppToast />
        </Root>
    );
};

// ComponentScaffold.propTypes = {
//   items: PropTypes.arrayOf(
//     PropTypes.shape({
//       name: PropTypes.string.isRequired,
//       route: PropTypes.string.isRequired,
//       icon: PropTypes.object,
//       props: PropTypes.object,
//       progress: PropTypes.shape({
//         status: PropTypes.bool.isRequired,
//       }),
//     })
//   ),
//   networkAction: PropTypes.bool.isRequired,
//   siteinfo: siteInfoProps,
//   children: PropTypes.object,
// };

const mapStateToProps = (state: State) => ({
    networkAction: state.networkAction,
    siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(ComponentScaffold);
