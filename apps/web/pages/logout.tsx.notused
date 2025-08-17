import { connect } from "react-redux";
import { useRouter } from "next/router";
import { actionCreators } from "@courselit/state-management";
import type { State, Address } from "@courselit/common-models";
import { signOut, useSession } from "next-auth/react";

interface LogoutProps {
    dispatch: any;
    address: Address;
}

const Logout = ({ dispatch }: LogoutProps) => {
    const router = useRouter();
    const { signedOut } = actionCreators;
    const { status } = useSession();

    if (status === "authenticated") {
        signOut();
        dispatch(signedOut());
        router.replace("/");
    }

    if (status === "unauthenticated") {
        router.replace("/");
    }

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
