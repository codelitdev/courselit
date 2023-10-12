import React from "react";
import { connect } from "react-redux";
import {
    GENERIC_SIGNOUT_TEXT,
    GENERIC_SIGNIN_TEXT,
} from "../../ui-config/strings";
import { Button } from "@courselit/components-library";
import Profile from "../../ui-models/profile";
import { AppState } from "@courselit/state-management";
import { signIn, signOut, useSession } from "next-auth/react";

interface SessionButtonProps {
    auth: any;
    profile: Profile;
}

function SessionButton(props: SessionButtonProps) {
    const { data: session } = useSession();

    if (session) {
        return (
            <Button onClick={() => signOut()} component="button">
                {GENERIC_SIGNOUT_TEXT}
            </Button>
        );
    }

    return (
        <Button onClick={() => signIn()} component="button">
            {GENERIC_SIGNIN_TEXT}
        </Button>
    );
}

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    profile: state.profile,
});

export default connect(mapStateToProps)(SessionButton);
