import { useRouter } from "next/router";
import React from "react";
import { PAGE_HEADER_EDIT_SEQUENCE } from "@ui-config/strings";
import dynamic from "next/dynamic";
import { AppDispatch, AppState } from "@courselit/state-management";
import { Address } from "@courselit/common-models";
import { connect } from "react-redux";

const SequenceEditor = dynamic(
    () => import("@components/admin/mails/sequence-editor"),
);
const BaseLayout = dynamic(() => import("@components/admin/base-layout"));

function EditPage({
    address,
    dispatch,
    loading,
}: {
    address: Address;
    dispatch: AppDispatch;
    loading: boolean;
}) {
    const router = useRouter();
    const { id } = router.query;
    return (
        <BaseLayout title={PAGE_HEADER_EDIT_SEQUENCE}>
            <SequenceEditor
                id={id as string}
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

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(EditPage);
