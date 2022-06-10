import React, { ReactChildren, useState } from "react";
import { styled } from "@mui/system";
import AppBar from "@mui/material/AppBar";
import CssBaseline from "@mui/material/CssBaseline";
import Drawer from "@mui/material/Drawer";
import Hidden from "@mui/material/Hidden";
import IconButton from "@mui/material/IconButton";
import { Menu } from "@mui/icons-material";
import { LinearProgress, Toolbar } from "@mui/material";
import { useTheme } from "@mui/material";
import AppToast from "../../../app-toast";
import { connect } from "react-redux";
import Header from "../header";
import dynamic from "next/dynamic";
import SiteInfo from "../../../../ui-models/site-info";
import Link from "../../../../ui-models/link";
import Profile from "../../../../ui-models/profile";
import State from "../../../../ui-models/state";

const PREFIX = "index";
const drawerWidth = 240;

const classes = {
    root: `${PREFIX}-root`,
    drawer: `${PREFIX}-drawer`,
    appBar: `${PREFIX}-appBar`,
    menuButton: `${PREFIX}-menuButton`,
    toolbar: `${PREFIX}-toolbar`,
    drawerPaper: `${PREFIX}-drawerPaper`,
    content: `${PREFIX}-content`,
    showprogress: `${PREFIX}-showprogress`,
    hideprogress: `${PREFIX}-hideprogress`,
    menuTitle: `${PREFIX}-menuTitle`,
};

const Root = styled("div")(({ theme }: { theme: any }) => ({
    [`&.${classes.root}`]: {
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

    [`& .${classes.hideprogress}`]: {
        visibility: "hidden",
    },

    [`& .${classes.showprogress}`]: {
        visibility: "visible",
    },

    [`& .${classes.menuTitle}`]: {
        marginLeft: theme.spacing(2),
    },
}));

const DrawerContent = dynamic(() => import("./drawer-content"));

interface ScaffoldProps {
    children: ReactChildren;
    siteinfo: SiteInfo;
    navigation: Link[];
    networkAction: boolean;
    profile: Profile;
}

const Scaffold = (props: ScaffoldProps) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const theme = useTheme();

    function handleDrawerToggle() {
        setMobileOpen(!mobileOpen);
    }

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
                        <DrawerContent
                            handleDrawerToggle={handleDrawerToggle}
                            forMobile={true}
                        />
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
                        <DrawerContent
                            handleDrawerToggle={handleDrawerToggle}
                            forMobile={false}
                        />
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
                {props.children}
            </main>
            <AppToast />
        </Root>
    );
};

const mapStateToProps = (state: State) => ({
    siteinfo: state.siteinfo,
    navigation: state.navigation.filter((link) => link.category === "main"),
    networkAction: state.networkAction,
    profile: state.profile,
});

export default connect(mapStateToProps)(Scaffold);
