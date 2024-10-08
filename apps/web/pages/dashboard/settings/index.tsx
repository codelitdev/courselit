import dynamic from "next/dynamic";
import { SITE_SETTINGS_PAGE_HEADING } from "@/ui-config/strings";
import { useRouter } from "next/router";
import { connect } from "react-redux";
import { Address, Profile, SiteInfo } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";

const BaseLayout = dynamic(() => import("@/components/admin/base-layout"));
const Settings = dynamic(() => import("@/components/admin/settings"));

function SettingsScreen({
    siteinfo,
    address,
    networkAction,
    profile,
    loading,
    dispatch,
}: {
    siteinfo: SiteInfo;
    address: Address;
    networkAction: boolean;
    profile: Profile;
    loading: boolean;
    dispatch: AppDispatch;
}) {
    const router = useRouter();
    const { tab } = router.query;

    return (
        <BaseLayout title={SITE_SETTINGS_PAGE_HEADING}>
            <Settings
                siteinfo={siteinfo}
                address={address}
                profile={profile as Profile}
                selectedTab={tab as any}
                dispatch={dispatch}
                loading={loading}
                networkAction={networkAction}
                prefix="/dashboard"
            />
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
    address: state.address,
    networkAction: state.networkAction,
    profile: state.profile,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(SettingsScreen);
