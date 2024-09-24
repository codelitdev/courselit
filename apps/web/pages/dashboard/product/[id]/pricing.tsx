import BaseLayout from "@components/admin/base-layout";
import { Address, SiteInfo } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import { MANAGE_COURSES_PAGE_HEADING } from "@ui-config/strings";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { connect } from "react-redux";

const ProductEditorLayout = dynamic(
    () => import("@/components/admin/products/editor/layout"),
);
const PricingEditor = dynamic(
    () => import("@/components/admin/products/editor/pricing"),
);

export function Pricing({
    address,
    dispatch,
    siteinfo,
}: {
    address: Address;
    siteinfo: SiteInfo;
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
                <PricingEditor
                    id={id as string}
                    address={address}
                    dispatch={dispatch}
                    siteinfo={siteinfo}
                />
            </ProductEditorLayout>
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    siteinfo: state.siteinfo,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Pricing);
