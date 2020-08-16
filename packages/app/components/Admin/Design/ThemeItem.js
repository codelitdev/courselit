import React, { useState } from "react";
import PropTypes from "prop-types";
import { Grid, Button } from "@material-ui/core";
import {
  BUTTON_THEME_APPLY,
  BUTTON_THEME_REMIX,
  BUTTON_THEME_UNINSTALL,
  POPUP_CANCEL_ACTION,
  POPUP_OK_ACTION,
  DELETE_THEME_POPUP_HEADER,
  APPLY_THEME_POPUP_HEADER,
} from "../../../config/strings";
import { makeStyles } from "@material-ui/styles";
import AppDialog from "../../Public/AppDialog";

const useStyles = makeStyles((theme) => ({
  container: {
    border: "1px solid transparent",
    "&:hover": {
      border: "1px solid #ccc",
    },
  },
}));

const ThemeItem = (props) => {
  const [
    uninstallConfirmationPopupOpened,
    setUninstallConfirmationPopupOpened,
  ] = useState(false);
  const [
    applyConfirmationPopupOpened,
    setApplyConfirmationPopupOpened,
  ] = useState(false);
  const classes = useStyles();

  const closeUninstallConfirmationPopup = () =>
    setUninstallConfirmationPopupOpened(false);

  const closeApplyConfirmationPopup = () =>
    setApplyConfirmationPopupOpened(false);

  const uninstallTheme = () => {
    setUninstallConfirmationPopupOpened(false);
    props.onUninstall(props.theme.id);
  };

  const applyTheme = () => {
    setApplyConfirmationPopupOpened(false);
    props.onApply(props.theme.id);
  };

  return (
    <Grid
      item
      container
      justify="space-between"
      alignItems="center"
      className={classes.container}
    >
      <Grid item>{props.theme.name}</Grid>
      <Grid item>
        <Grid container spacing={2}>
          {!props.theme.active && (
            <Grid item>
              <Button
                variant="contained"
                onClick={() => setApplyConfirmationPopupOpened(true)}
              >
                {BUTTON_THEME_APPLY}
              </Button>
            </Grid>
          )}
          <Grid item>
            <Button
              variant="contained"
              onClick={() => props.onRemix(props.theme.id)}
            >
              {BUTTON_THEME_REMIX}
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              onClick={() => setUninstallConfirmationPopupOpened(true)}
            >
              {BUTTON_THEME_UNINSTALL}
            </Button>
          </Grid>
        </Grid>
      </Grid>
      <AppDialog
        onOpen={uninstallConfirmationPopupOpened}
        onClose={closeUninstallConfirmationPopup}
        title={`${DELETE_THEME_POPUP_HEADER} ${props.theme.name}?`}
        actions={[
          {
            name: POPUP_CANCEL_ACTION,
            callback: closeUninstallConfirmationPopup,
          },
          { name: POPUP_OK_ACTION, callback: uninstallTheme },
        ]}
      />
      <AppDialog
        onOpen={applyConfirmationPopupOpened}
        onClose={closeApplyConfirmationPopup}
        title={`${APPLY_THEME_POPUP_HEADER} ${props.theme.name}?`}
        actions={[
          { name: POPUP_CANCEL_ACTION, callback: closeApplyConfirmationPopup },
          { name: POPUP_OK_ACTION, callback: applyTheme },
        ]}
      />
    </Grid>
  );
};

ThemeItem.propTypes = {
  theme: PropTypes.object.isRequired,
  onApply: PropTypes.func.isRequired,
  onRemix: PropTypes.func.isRequired,
  onUninstall: PropTypes.func.isRequired,
};

export default ThemeItem;
