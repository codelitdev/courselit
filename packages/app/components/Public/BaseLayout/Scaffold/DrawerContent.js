import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { List } from "@material-ui/core";
import { link, profileProps, siteInfoProps } from "../../../../types";
import dynamic from "next/dynamic";
import {
  MAIN_MENU_ITEM_DASHBOARD,
  MAIN_MENU_ITEM_PROFILE,
} from "../../../../config/strings";
import { NAVIGATION_CATEGORY_MAIN } from "../../../../config/constants";
import { canAccessDashboard } from "../../../../lib/utils";

const MenuItem = dynamic(() => import("./MenuItem"));
const Branding = dynamic(() => import("../Branding"));

const DrawerContent = ({
  navigation,
  profile,
  handleDrawerToggle,
  forMobile = false,
}) => {
  return (
    <div>
      <Branding />
      <List>
        {profile.fetched && (
          <>
            {profile.id && (
              <>
                <MenuItem
                  link={{
                    text: MAIN_MENU_ITEM_PROFILE,
                    destination: `/profile/${
                      profile.userId && profile.userId !== -1
                        ? profile.userId
                        : profile.id
                    }`,
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
          navigation.map((link) =>
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
};

DrawerContent.propTypes = {
  forMobile: PropTypes.bool,
  profile: profileProps,
  navigation: PropTypes.arrayOf(link),
  siteinfo: siteInfoProps,
  handleDrawerToggle: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  profile: state.profile,
  navigation: state.navigation,
  siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(DrawerContent);
