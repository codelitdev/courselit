import { Address, Auth, Profile, Media } from "@courselit/common-models";
import {
    Checkbox,
    Form,
    FormField,
    FormSubmit,
    IconButton,
    MediaSelector,
    PageBuilderPropertyHeader,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    BUTTON_SAVE,
    EDIT_PAGE_SEO_HEADER,
    SEO_FORM_DESC_LABEL,
    SEO_FORM_NAME_LABEL,
    SEO_FORM_ROBOTS_LABEL,
    SEO_FORM_SOCIAL_IMAGE_LABEL,
    SEO_FORM_SOCIAL_IMAGE_TOOLTIP,
} from "@ui-config/strings";
import { ChangeEvent, FormEvent, useState } from "react";
import { connect } from "react-redux";
import { Cross as Close } from "@courselit/icons";

function SeoEditor({
    title,
    description,
    socialImage,
    robotsAllowed,
    dispatch,
    auth,
    profile,
    address,
    onClose,
    onSave,
}: {
    title: string;
    description: string;
    socialImage: Media | {};
    robotsAllowed: boolean;
    dispatch: AppDispatch;
    auth: Auth;
    profile: Profile;
    address: Address;
    onClose: (...args: any[]) => void;
    onSave: (...args: any[]) => void;
}) {
    const [name, setName] = useState(title);
    const [innerDescription, setInnerDescription] = useState(description);
    const [innerRobotsAllowed, setInnerRobotsAllowed] = useState(robotsAllowed);
    const [innerSocialImage, setInnerSocialImage] =
        useState<Partial<Media>>(socialImage);

    const onSubmit = (e: FormEvent<HTMLButtonElement>) => {
        e.preventDefault();

        onSave({
            title: name,
            description: innerDescription,
            socialImage: Object.keys(innerSocialImage).length
                ? innerSocialImage
                : null,
            robotsAllowed: innerRobotsAllowed,
        });
    };

    return (
        <div className="flex flex-col">
            <div className="flex items-center px-2 py-3 justify-between">
                <h2 className="text-lg font-medium">{EDIT_PAGE_SEO_HEADER}</h2>
                <IconButton onClick={onClose} variant="soft">
                    <Close fontSize="small" />
                </IconButton>
            </div>
            <Form className="flex flex-col p-2 gap-4" onSubmit={onSubmit}>
                <FormField
                    required
                    label={SEO_FORM_NAME_LABEL}
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <FormField
                    component="textarea"
                    value={innerDescription}
                    multiline="true"
                    rows={5}
                    label={SEO_FORM_DESC_LABEL}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setInnerDescription(e.target.value)
                    }
                />
                <PageBuilderPropertyHeader
                    label={SEO_FORM_SOCIAL_IMAGE_LABEL}
                    tooltip={SEO_FORM_SOCIAL_IMAGE_TOOLTIP}
                />
                <MediaSelector
                    title=""
                    src={innerSocialImage && innerSocialImage.thumbnail}
                    srcTitle={
                        innerSocialImage && innerSocialImage.originalFileName
                    }
                    dispatch={dispatch}
                    auth={auth}
                    profile={profile}
                    address={address}
                    onSelection={(media: Media) => {
                        if (media) {
                            setInnerSocialImage(media);
                        }
                    }}
                    onRemove={() => {
                        setInnerSocialImage({});
                    }}
                    strings={{}}
                    access="public"
                    mediaId={innerSocialImage && innerSocialImage.mediaId}
                />
                <div className="flex justify-between">
                    <PageBuilderPropertyHeader label={SEO_FORM_ROBOTS_LABEL} />
                    <Checkbox
                        checked={innerRobotsAllowed}
                        onChange={(value: boolean) =>
                            setInnerRobotsAllowed(value)
                        }
                    />
                </div>
                <div>
                    <FormSubmit
                        text={BUTTON_SAVE}
                        disabled={
                            !name ||
                            (title === name &&
                                description === innerDescription &&
                                JSON.stringify(socialImage) ===
                                    JSON.stringify(innerSocialImage) &&
                                robotsAllowed === innerRobotsAllowed)
                        }
                    />
                </div>
            </Form>
        </div>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    auth: state.auth,
    profile: state.profile,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(SeoEditor);
