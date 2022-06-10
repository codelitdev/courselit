import React from "react";
import { styled } from "@mui/system";
import { connect } from "react-redux";
import { List } from "@mui/material";
import dynamic from "next/dynamic";
import {
    MAIN_MENU_ITEM_DASHBOARD,
    MAIN_MENU_ITEM_PROFILE,
} from "../../../../ui-config/strings";
import { NAVIGATION_CATEGORY_MAIN } from "../../../../ui-config/constants";
import { canAccessDashboard } from "../../../../ui-lib/utils";
import Link from "../../../../ui-models/link";
import Profile from "../../../../ui-models/profile";
import SiteInfo from "../../../../ui-models/site-info";
import State from "../../../../ui-models/state";

const PREFIX = "DrawerContent";

const classes = {
    branding: `${PREFIX}-branding`,
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const Root = styled("div")(({ theme }: { theme: any }) => ({
    [`& .${classes.branding}`]: {
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
    },
}));

const MenuItem = dynamic(() => import("./menu-item"));
const Branding = dynamic(() => import("../branding"));

interface DrawerContentProps {
    navigation: Link[];
    profile: Profile;
    siteinfo: SiteInfo;
    handleDrawerToggle: () => void;
    forMobile: boolean;
}

const DrawerContent = ({
    navigation,
    profile,
    handleDrawerToggle,
    forMobile = false,
}: DrawerContentProps) => {
    return (
        <Root>
            <div className={classes.branding}>
                <Branding />
            </div>
            <List>
                {profile.fetched && (
                    <>
                        {profile.id && (
                            <>
                                <MenuItem
                                    link={{
                                        text: MAIN_MENU_ITEM_PROFILE,
                                        destination: `/profile/${profile.userId}`,
                                        category: NAVIGATION_CATEGORY_MAIN,
                                        newTab: false,
                                    }}
                                />
                            </>
                        )}
                        {canAccessDashboard(profile) && (
                            <MenuItem
                                link={{
                                    text: MAIN_MENU_ITEM_DASHBOARD,
                                    destination: "/dashboard/courses",
                                    category: NAVIGATION_CATEGORY_MAIN,
                                    newTab: false,
                                }}
                            />
                        )}
                    </>
                )}
                {navigation &&
                    navigation
                        .filter(
                            (link) => link.category === NAVIGATION_CATEGORY_MAIN
                        )
                        .map((link) =>
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
        </Root>
    );
};

const mapStateToProps = (state: State) => ({
    profile: state.profile,
    navigation: state.navigation,
    siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(DrawerContent);
