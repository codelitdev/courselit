import React from "react";
import Link from "next/link";
import { connect } from "react-redux";
import {
    GENERIC_SIGNOUT_TEXT,
    GENERIC_SIGNIN_TEXT,
} from "../../ui-config/strings";
import { Button } from "@mui/material";
import Profile from "../../ui-models/profile";
import State from "../../ui-models/state";

interface SessionButtonProps {
    auth: any;
    profile: Profile;
}

function SessionButton(props: SessionButtonProps) {
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

const mapStateToProps = (state: State) => ({
    auth: state.auth,
    profile: state.profile,
});

export default connect(mapStateToProps)(SessionButton);
