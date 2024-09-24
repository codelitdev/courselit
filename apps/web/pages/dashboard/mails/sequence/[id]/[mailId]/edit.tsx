import { useRouter } from "next/router";
import React from "react";
import { PAGE_HEADER_EDIT_SEQUENCE } from "@ui-config/strings";
import dynamic from "next/dynamic";
import { AppDispatch, AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { Address } from "@courselit/common-models";

const MailEditor = dynamic(
    () => import("@components/admin/mails/sequence-mail-editor"),
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
    const { id, mailId } = router.query;
    return (
        <BaseLayout title={PAGE_HEADER_EDIT_SEQUENCE}>
            <MailEditor
                sequenceId={id as string}
                mailId={mailId as string}
                address={address}
                dispatch={dispatch}
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
