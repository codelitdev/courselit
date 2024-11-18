import { useRouter } from "next/router";
import React, { useEffect } from "react";
import PageEditor from "../../../../components/admin/page-editor";
import {
    AppDispatch,
    AppState,
    actionCreators,
} from "@courselit/state-management";
import { connect } from "react-redux";
import {
    Address,
    Message,
    Profile,
    SiteInfo,
    Theme,
    Typeface,
} from "@courselit/common-models";
import { canAccessDashboard } from "@ui-lib/utils";
import { useSession } from "next-auth/react";
import AppLoader from "@components/app-loader";
import { AppToast } from "@components/app-toast";

interface EditPageProps {
    address: Address;
    profile: Profile;
    dispatch: AppDispatch;
    loading: boolean;
    siteInfo: SiteInfo;
    theme: Theme;
    typefaces: Typeface[];
    message: Message;
    state: AppState;
}

function EditPage({
    address,
    profile,
    dispatch,
    loading,
    siteInfo,
    typefaces,
    message,
    state,
}: EditPageProps) {
    const router = useRouter();
    const { id, redirectTo } = router.query;
    const { status } = useSession();

    useEffect(() => {
        if (profile.fetched && !canAccessDashboard(profile)) {
            router.push("/");
        }
    }, [profile.fetched, router, profile]);

    useEffect(() => {
        if (status === "authenticated") {
            dispatch && dispatch(actionCreators.signedIn());
            dispatch && dispatch(actionCreators.authChecked());
        }
        if (status === "unauthenticated") {
            dispatch && dispatch(actionCreators.authChecked());
            router.push(`/login?redirect=${router.asPath}`);
        }
    }, [status, dispatch, router]);

    if (profile.fetched && canAccessDashboard(profile)) {
        return (
            <>
                <PageEditor
                    id={id as string}
                    redirectTo={
                        redirectTo
                            ? typeof redirectTo === "string"
                                ? redirectTo
                                : redirectTo[0]
                            : ""
                    }
                    address={address}
                    dispatch={dispatch}
                    siteInfo={siteInfo}
                    typefaces={typefaces}
                    profile={profile}
                    prefix="/dashboard"
                    state={state}
                />
                {message && dispatch && (
                    <AppToast dispatch={dispatch} message={message} />
                )}
            </>
        );
    }

    return (
        <div className="flex justify-center items-center h-screen w-full">
            <AppLoader />
        </div>
    );
}

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    address: state.address,
    loading: state.networkAction,
    siteInfo: state.siteinfo,
    theme: state.theme,
    typefaces: state.typefaces,
    message: state.message,
    state: state,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(EditPage);
