import dynamic from "next/dynamic";
import { NEW_PAGE_HEADING } from "../../../ui-config/strings";
import { connect } from "react-redux";
import { AppDispatch, AppState } from "@courselit/state-management";
import { Address } from "@courselit/common-models";

const BaseLayout = dynamic(
    () => import("../../../components/admin/base-layout"),
);
const NewPage = dynamic(
    () => import("../../../components/admin/pages/new-page"),
);

function AllPages({
    address,
    networkAction,
    dispatch,
}: {
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
}) {
    return (
        <BaseLayout title={NEW_PAGE_HEADING}>
            <NewPage
                address={address}
                networkAction={networkAction}
                dispatch={dispatch}
                prefix="/dashboard"
            />
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    networkAction: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(AllPages);
