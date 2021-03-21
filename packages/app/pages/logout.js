import { useEffect } from "react";
import { connect } from "react-redux";
import Router from "next/router";
import { signedOut } from "../redux/actions";

const Logout = ({ dispatch, address }) => {
  useEffect(() => {
    dispatch(signedOut(address.domain));
    Router.replace("/");
  });

  return <div></div>;
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Logout);
