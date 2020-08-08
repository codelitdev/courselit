import { useEffect } from "react";
import { connect } from "react-redux";
import Router from "next/router";
// import { removeCookie } from '../lib/session.js'
import { signedOut } from "../redux/actions";
// import {
//   JWT_COOKIE_NAME,
//   USERID_COOKIE_NAME
// } from '../config/constants.js'

const Logout = (props) => {
  useEffect(() => {
    // removeCookie(JWT_COOKIE_NAME)
    // removeCookie(USERID_COOKIE_NAME)
    props.dispatch(signedOut());
    Router.replace("/");
  });

  return <div></div>;
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});
const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Logout);
