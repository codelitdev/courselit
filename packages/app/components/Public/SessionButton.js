/**
 * This component provides a clickable button which shows if the user
 * is logged in or is a guest.
 */

import React from "react";
import Link from "next/link";
import { connect } from "react-redux";
import {
  GENERIC_SIGNOUT_TEXT,
  GENERIC_SIGNIN_TEXT,
} from "../../config/strings.js";
import { authProps, profileProps } from "../../types.js";
import { Button } from "@material-ui/core";

function SessionButton(props) {
  return (
    <>
      {props.auth.guest ? (
        <Link href="/login">
          <Button>{GENERIC_SIGNIN_TEXT}</Button>
        </Link>
      ) : (
        <Link href="/logout">
          <Button>{GENERIC_SIGNOUT_TEXT}</Button>
        </Link>
      )}
    </>
  );
}

SessionButton.propTypes = {
  auth: authProps,
  profile: profileProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  profile: state.profile,
});

export default connect(mapStateToProps)(SessionButton);
