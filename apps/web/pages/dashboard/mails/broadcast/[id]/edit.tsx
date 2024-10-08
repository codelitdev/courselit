import { useRouter } from "next/router";
import React from "react";
import { PAGE_HEADER_EDIT_MAIL } from "@ui-config/strings";
import dynamic from "next/dynamic";
import { connect } from "react-redux";
import { AppDispatch, AppState } from "@courselit/state-management";
import { Address } from "@courselit/common-models";

const BroadcastEditor = dynamic(
    () => import("@components/admin/mails/broadcast-editor"),
);
const BaseLayout = dynamic(() => import("@components/admin/base-layout"));

function EditPage({
    address,
    dispatch,
}: {
    address: Address;
    dispatch: AppDispatch;
}) {
    const router = useRouter();
    const { id } = router.query;
    return (
        <BaseLayout title={PAGE_HEADER_EDIT_MAIL}>
            <BroadcastEditor
                id={id as string}
                address={address}
                dispatch={dispatch}
                prefix="/dashboard"
            />
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(EditPage);
