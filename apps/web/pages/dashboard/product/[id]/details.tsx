import BaseLayout from "@components/admin/base-layout";
import { Address, Profile } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import { MANAGE_COURSES_PAGE_HEADING } from "@ui-config/strings";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { connect } from "react-redux";

const ProductEditorLayout = dynamic(
    () => import("@/components/admin/products/editor/layout"),
);
const DetailsEditor = dynamic(
    () => import("@/components/admin/products/editor/details"),
);

export function Details({
    address,
    profile,
    dispatch,
}: {
    address: Address;
    profile: Profile;
    dispatch?: AppDispatch;
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
                <DetailsEditor
                    id={id as string}
                    address={address}
                    profile={profile}
                    dispatch={dispatch}
                />
            </ProductEditorLayout>
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Details);
