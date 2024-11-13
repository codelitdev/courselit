import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ProductEditorLayoutProps } from "../../../../components/admin/products/editor/layout";
import { MANAGE_COURSES_PAGE_HEADING } from "@ui-config/strings";
import BaseLayout from "@components/admin/base-layout";
import { AppDispatch, AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { Address } from "@courselit/common-models";

const ProductEditorLayout = dynamic<ProductEditorLayoutProps>(
    () => import("../../../../components/admin/products/editor/layout"),
);
const CourseReports = dynamic(
    () => import("../../../../components/admin/products/editor/reports"),
);

export function Reports({
    address,
    loading,
    dispatch,
}: {
    address: Address;
    loading: boolean;
    dispatch: AppDispatch;
}) {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BaseLayout title={MANAGE_COURSES_PAGE_HEADING}>
            <ProductEditorLayout id={id} prefix="/dashboard" address={address}>
                <CourseReports
                    id={id as string}
                    address={address}
                    dispatch={dispatch}
                    loading={loading}
                    prefix="/dashboard"
                />
            </ProductEditorLayout>
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps)(Reports);
