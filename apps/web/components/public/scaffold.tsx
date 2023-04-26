import React, { ReactNode, useState } from "react";
import { styled } from "@mui/system";
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
    Typography,
    ListSubheader,
} from "@mui/material";
import { useTheme } from "@mui/material";
import AppToast from "../app-toast";
import DrawerListItemIcon from "./base-layout/drawer-list-item-icon";
import Header from "./base-layout/header";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import { AppState } from "@courselit/state-management";

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
            // [theme.breakpoints.up("sm")]: {
            //     width: `calc(100% - ${drawerWidth}px)`,
            //     marginLeft: drawerWidth,
            // },
        },
        theme.appBar
    ),

    [`& .${classes.menuButton}`]: {
        [theme.breakpoints.up("sm")]: {
            display: "none",
        },
    },

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

export interface ComponentScaffoldMenuItem {
    label: string;
    href?: string;
    icon?: ReactNode;
    iconPlacementRight?: boolean;
}

interface ComponentScaffoldProps {
    networkAction: boolean;
    items: ComponentScaffoldMenuItem[];
    contentPadding?: number;
    children: ReactNode;
}

const ComponentScaffold = ({
    items,
    networkAction,
    contentPadding,
    children,
}: ComponentScaffoldProps) => {
    const theme = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);
    const router = useRouter();

    function handleDrawerToggle() {
        setMobileOpen(!mobileOpen);
    }

    function navigateTo(route: string) {
        router.push(route);
    }

    const drawer = (
        <>
            <Toolbar />
            <List>
                {items.map((item: ComponentScaffoldMenuItem, index: number) =>
                    item.href ? (
                        <ListItem
                            button
                            key={index}
                            onClick={() => navigateTo(item.href as string)}
                            sx={{
                                backgroundColor:
                                    router.asPath === item.href
                                        ? "#d6d6d6"
                                        : "inherit",
                            }}
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
                                    <Grid item>
                                        <DrawerListItemIcon
                                            icon={item.icon as object}
                                        />
                                    </Grid>
                                )}
                                <Grid item>
                                    <Typography variant="subtitle2">
                                        {item.label as string}
                                    </Typography>
                                    {/* <ListItemText primary={item.name} /> */}
                                </Grid>
                                {item.icon && item.iconPlacementRight && (
                                    <Grid item>
                                        <DrawerListItemIcon
                                            icon={item.icon as object}
                                            right={true}
                                        />
                                    </Grid>
                                )}
                            </Grid>
                        </ListItem>
                    ) : (
                        <ListSubheader key={index} sx={{ mt: 2 }}>
                            {item.label as string}
                        </ListSubheader>
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
                <Toolbar />
                <LinearProgress
                    className={
                        networkAction
                            ? classes.showprogress
                            : classes.hideprogress
                    }
                />
                <Grid
                    container
                    sx={{
                        p: contentPadding || 2,
                    }}
                >
                    <Grid item xs={12} className={classes.contentMain}>
                        {children}
                    </Grid>
                </Grid>
            </main>
            <AppToast />
        </Root>
    );
};

const mapStateToProps = (state: AppState) => ({
    networkAction: state.networkAction,
});

export default connect(mapStateToProps)(ComponentScaffold);
