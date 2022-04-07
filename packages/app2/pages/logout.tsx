import { useEffect } from "react";
import { connect } from "react-redux";
import Router from "next/router";
import { setAppMessage, signedOut } from "../state/actions";
import State from "../ui-models/state";
import Address from "../ui-models/address";
import AppMessage from "../ui-models/app-message";
import { UNABLE_TO_LOGOUT } from "../ui-config/strings";

interface LogoutProps {
  dispatch: any;
  address: Address;
}

const Logout = ({ dispatch, address }: LogoutProps) => {
  useEffect(() => {
    logout();
  });

  const logout = async () => {
    const response = await fetch("/api/auth/logout");
    if (response.status === 200) {
      dispatch(signedOut());
      Router.replace("/");
    } else {
      dispatch(setAppMessage(new AppMessage(UNABLE_TO_LOGOUT)));
    }
  };

  return <div></div>;
};

const mapStateToProps = (state: State) => ({
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch: any) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Logout);
