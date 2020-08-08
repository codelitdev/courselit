import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Snackbar, IconButton, Button } from "@material-ui/core";
import { clearAppMessage } from "../redux/actions";
import { appMessage } from "../types";
import { Close } from "@material-ui/icons";

const AppToast = (props) => {
  const { message } = props;
  const action = message && message.action;

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    props.dispatch(clearAppMessage());
  };

  const getActionButtonsArray = () => {
    const actionButtonsArray = [
      <IconButton
        key="close"
        aria-label="close"
        color="inherit"
        onClick={handleClose}
      >
        <Close />
      </IconButton>,
    ];
    if (action) {
      actionButtonsArray.unshift(
        <Button
          key="action"
          color="secondary"
          size="small"
          onClick={message.action.cb}
        >
          {message.action.text}
        </Button>
      );
    }

    return actionButtonsArray;
  };

  return (
    <>
      {message && (
        <Snackbar
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          open={message.open}
          autoHideDuration={6000}
          onClose={handleClose}
          message={<span>{message.message}</span>}
          action={getActionButtonsArray()}
        />
      )}
    </>
  );
};

AppToast.propTypes = {
  message: appMessage.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  message: state.message,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(AppToast);
