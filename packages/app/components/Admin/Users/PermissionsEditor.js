import React, { useEffect, useState } from "react";
import { Grid, Typography, Checkbox, IconButton } from "@material-ui/core";
import { ExpandLess, ExpandMore } from "@material-ui/icons";
import { permissions } from "../../../config/constants";
import {
  PERM_COURSE_MANAGE,
  PERM_COURSE_MANAGE_ANY,
  PERM_COURSE_PUBLISH,
  PERM_ENROLL_IN_COURSE,
  PERM_LAYOUT,
  PERM_MEDIA_MANAGE,
  PERM_MEDIA_MANAGE_ANY,
  PERM_MEDIA_VIEW_ANY,
  PERM_MEDIA_UPLOAD,
  PERM_MENUS,
  PERM_SECTION_HEADER,
  PERM_SETTINGS,
  PERM_THEMES,
  PERM_USERS,
  PERM_WIDGETS,
} from "../../../config/strings";
import { connect } from "react-redux";
import FetchBuilder from "../../../lib/fetch";
import {
  addressProps,
  authProps,
  dispatchProps,
  networkActionProps,
  siteUser,
} from "../../../types";
import { networkAction, setAppMessage } from "../../../redux/actions";
import AppMessage from "../../../models/app-message";

function PermissionsEditor({
  user,
  auth,
  address,
  dispatch,
  networkAction: networkCallUnderway,
}) {
  const [activePermissions, setActivePermissions] = useState([]);
  const [expanded, setExpanded] = useState(false);

  const permissionToCaptionMap = {
    [permissions.manageCourse]: PERM_COURSE_MANAGE,
    [permissions.manageAnyCourse]: PERM_COURSE_MANAGE_ANY,
    [permissions.publishCourse]: PERM_COURSE_PUBLISH,
    [permissions.enrollInCourse]: PERM_ENROLL_IN_COURSE,
    [permissions.viewAnyMedia]: PERM_MEDIA_VIEW_ANY,
    [permissions.uploadMedia]: PERM_MEDIA_UPLOAD,
    [permissions.manageMedia]: PERM_MEDIA_MANAGE,
    [permissions.manageAnyMedia]: PERM_MEDIA_MANAGE_ANY,
    [permissions.manageLayout]: PERM_LAYOUT,
    [permissions.manageThemes]: PERM_THEMES,
    [permissions.manageMenus]: PERM_MENUS,
    [permissions.manageWidgets]: PERM_WIDGETS,
    [permissions.manageSettings]: PERM_SETTINGS,
    [permissions.manageUsers]: PERM_USERS,
  };

  useEffect(() => {
    setActivePermissions(user.permissions);
  }, [user]);

  const toggleExpandedState = () => {
    setExpanded(!expanded);
  };

  const savePermissions = async (permission, event) => {
    event.preventDefault();
    const state = event.target.checked;

    let newPermissions;
    if (state) {
      newPermissions = [...activePermissions, permission];
    } else {
      newPermissions = activePermissions.filter((item) => item !== permission);
    }

    const mutation = `
        mutation {
            user: updateUser(userData: {
                id: "${user.id}"
                permissions: [${newPermissions
                  .map((item) => `"${item}"`)
                  .join()}]
            }) { 
                permissions
            }
        }
        `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/graph`)
      .setPayload(mutation)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.user) {
        setActivePermissions(response.user.permissions);
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  return (
    <Grid container direction="column">
      <Grid item container justify="space-between">
        <Grid item>
          <Typography variant="h4">{PERM_SECTION_HEADER}</Typography>
        </Grid>
        <Grid item>
          <IconButton onClick={toggleExpandedState}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Grid>
      </Grid>
      {expanded &&
        Object.keys(permissionToCaptionMap).map((permission) => (
          <Grid
            item
            container
            direction="row"
            justify="space-between"
            xs
            key={permission}
          >
            <Typography variant="subtitle1">
              {permissionToCaptionMap[permission]}
            </Typography>
            {networkCallUnderway && (
              <Checkbox
                name={permission}
                disabled
                checked={activePermissions.includes(permission)}
              />
            )}
            {!networkCallUnderway && (
              <Checkbox
                name={permission}
                checked={activePermissions.includes(permission)}
                onChange={(e) => savePermissions(permission, e)}
              />
            )}
          </Grid>
        ))}
    </Grid>
  );
}

PermissionsEditor.propTypes = {
  user: siteUser,
  auth: authProps,
  address: addressProps,
  networkAction: networkActionProps,
  dispatch: dispatchProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
  networkAction: state.networkAction,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(PermissionsEditor);
