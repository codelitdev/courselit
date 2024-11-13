import BaseLayout from "@components/admin/base-layout";
import { Address, Profile, SiteInfo } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { connect } from "react-redux";
import { MANAGE_BLOG_PAGE_HEADING } from "@/ui-config/strings";

const BlogEditorLayout = dynamic(
    () => import("../../../../components/admin/blogs/editor/layout"),
);
const DetailsEditor = dynamic(
    () => import("../../../../components/admin/blogs/editor/details"),
);

export function Details({
    profile,
    siteInfo,
    address,
}: {
    profile: Profile;
    siteInfo: SiteInfo;
    address: Address;
}) {
    const router = useRouter();
    const { id } = router.query;

    return (
        <BaseLayout title={MANAGE_BLOG_PAGE_HEADING}>
            <BlogEditorLayout
                id={id as string}
                profile={profile}
                siteInfo={siteInfo}
                address={address}
                prefix="/dashboard"
            >
                <DetailsEditor id={id as string} />
            </BlogEditorLayout>
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    siteInfo: state.siteinfo,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Details);
