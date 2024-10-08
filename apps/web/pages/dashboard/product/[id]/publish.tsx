import BaseLayout from "@components/admin/base-layout";
import { Address } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import { MANAGE_COURSES_PAGE_HEADING } from "@ui-config/strings";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { connect } from "react-redux";

const ProductEditorLayout = dynamic(
    () => import("@/components/admin/products/editor/layout"),
);
const PublishEditor = dynamic(
    () => import("@/components/admin/products/editor/publish"),
);

function Publish({
    address,
    dispatch,
}: {
    address: Address;
    dispatch: AppDispatch;
}) {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
            <ProductEditorLayout
                id={id as string}
                prefix="/dashboard"
                address={address}
            >
                <PublishEditor
                    id={id as string}
                    dispatch={dispatch}
                    address={address}
                />
            </ProductEditorLayout>
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Publish);
