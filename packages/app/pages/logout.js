import { useEffect } from "react";
import { connect } from "react-redux";
import Router from "next/router";
import { signedOut } from "../redux/actions";

const Logout = (props) => {
  useEffect(() => {
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
