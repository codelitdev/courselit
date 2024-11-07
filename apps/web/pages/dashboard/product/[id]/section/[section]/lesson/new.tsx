import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { BUTTON_NEW_LESSON_TEXT } from "@/ui-config/strings";
import { AppDispatch, AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { Address, Profile } from "@courselit/common-models";

const BaseLayout = dynamic(() => import("@/components/admin/base-layout"));
const LessonEditor = dynamic(
    () => import("@/components/admin/products/editor/content/lesson"),
);

function NewLesson({
    dispatch,
    address,
    profile,
}: {
    profile: Profile;
    dispatch: AppDispatch;
    address: Address;
}) {
    const router = useRouter();
    const { id, section } = router.query;

    return (
        <BaseLayout title={BUTTON_NEW_LESSON_TEXT}>
            <LessonEditor
                courseId={id as string}
                sectionId={section as string}
                dispatch={dispatch}
                address={address}
                profile={profile}
                prefix="/dashboard"
                isNew={true}
            />
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(NewLesson);
