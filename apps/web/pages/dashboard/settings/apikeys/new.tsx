import dynamic from "next/dynamic";
import { SITE_SETTINGS_PAGE_HEADING } from "../../../../ui-config/strings";
import { Address } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import { connect } from "react-redux";

const BaseLayout = dynamic(
    () => import("../../../../components/admin/base-layout"),
);
const ApikeyNew = dynamic(
    () => import("../../../../components/admin/settings/apikey/new"),
);

function SiteUsers({
    address,
    dispatch,
    loading,
}: {
    address: Address;
    dispatch: AppDispatch;
    loading: boolean;
}) {
    return (
        <BaseLayout title={SITE_SETTINGS_PAGE_HEADING}>
            <ApikeyNew
                address={address}
                dispatch={dispatch}
                loading={loading}
                prefix="/dashboard"
            />
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(SiteUsers);
