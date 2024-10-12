import { Address } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import { USERS_TAG_HEADER } from "@ui-config/strings";
import dynamic from "next/dynamic";
import { connect } from "react-redux";

const BaseLayout = dynamic(() => import("@components/admin/base-layout"));
const Tags = dynamic(() => import("@components/admin/users/tags"));

function TagsIndex({
    address,
    dispatch,
}: {
    address: Address;
    dispatch: AppDispatch;
}) {
    return (
        <BaseLayout title={USERS_TAG_HEADER}>
            <Tags prefix="/dashboard" address={address} />
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(TagsIndex);
