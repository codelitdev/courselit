import dynamic from "next/dynamic";
import {
    BROADCASTS,
    PAGE_HEADER_ALL_MAILS,
    SEQUENCES,
} from "../../../ui-config/strings";
import { useRouter } from "next/router";
import { connect } from "react-redux";
import { Address } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";

const Mails = dynamic(() => import("../../../components/admin/mails"));
const BaseLayout = dynamic(
    () => import("../../../components/admin/base-layout"),
);

function EditPage({
    address,
    loading,
    dispatch,
}: {
    address: Address;
    loading: boolean;
    dispatch: AppDispatch;
}) {
    const router = useRouter();
    const { tab } = router.query;

    return (
        <BaseLayout title={PAGE_HEADER_ALL_MAILS}>
            <Mails
                selectedTab={tab as typeof BROADCASTS | typeof SEQUENCES}
                address={address}
                dispatch={dispatch}
                prefix="/dashboard"
                loading={loading}
            />
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(EditPage);
