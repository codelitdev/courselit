import { useEffect } from "react";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import { actionCreators } from "@courselit/state-management";
import type { State, Address } from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import { UNABLE_TO_LOGOUT } from "../ui-config/strings";

interface LogoutProps {
    dispatch: any;
    address: Address;
}

const Logout = ({ dispatch }: LogoutProps) => {
    const router = useRouter();
    const { setAppMessage, signedOut } = actionCreators;
    useEffect(() => {
        logout();
    }, []);

    const logout = async () => {
        const response = await fetch("/api/auth/logout");
        if (response.status === 200) {
            dispatch(signedOut());
            router.replace("/");
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

// export async function getServerSideProps(context: any) {
//     const { req } = context;
//     const address = getBackendAddress(req.headers);
//     await fetch(`${address}/api/auth/logout`);
//     return { props: {} };
// }
