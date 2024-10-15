import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { NEW_SECTION_HEADER } from "@ui-config/strings";
import { AppDispatch, AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { Address } from "@courselit/common-models";

const BaseLayout = dynamic(() => import("@components/admin/base-layout"));

const SectionEditor = dynamic(
    () => import("@components/admin/products/editor/section"),
);

function NewSection({
    loading,
    address,
    dispatch,
}: {
    loading: boolean;
    address: Address;
    dispatch: AppDispatch;
}) {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BaseLayout title={NEW_SECTION_HEADER}>
            <SectionEditor
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
    loading: state.networkAction,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(NewSection);
