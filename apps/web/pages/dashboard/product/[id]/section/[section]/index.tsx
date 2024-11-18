import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { EDIT_SECTION_HEADER } from "@/ui-config/strings";
import { connect } from "react-redux";
import { AppDispatch, AppState } from "@courselit/state-management";
import { Address } from "@courselit/common-models";

const BaseLayout = dynamic(() => import("@/components/admin/base-layout"));

const SectionEditor = dynamic(
    () => import("@/components/admin/products/editor/section"),
);

function EditSection({
    address,
    dispatch,
    loading,
}: {
    address: Address;
    dispatch: AppDispatch;
    loading: boolean;
}) {
    const router = useRouter();
    const { id, section } = router.query;

    return (
        <BaseLayout title={EDIT_SECTION_HEADER}>
            <SectionEditor
                address={address}
                id={id as string}
                section={section as string}
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

export default connect(mapStateToProps, mapDispatchToProps)(EditSection);
