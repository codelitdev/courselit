import { useEffect, useState } from "react";
import { FetchBuilder } from "@courselit/utils";
import {
    PROFILE_PAGE_HEADER,
    PROFILE_SECTION_DETAILS_NAME,
    PROFILE_SECTION_DETAILS_BIO,
    PROFILE_SECTION_DETAILS_EMAIL,
    BUTTON_SAVE,
    APP_MESSAGE_CHANGES_SAVED,
    PROFILE_SECTION_DETAILS,
    PROFILE_EMAIL_PREFERENCES,
    PROFILE_EMAIL_PREFERENCES_NEWSLETTER_OPTION_TEXT,
    PROFILE_SECTION_DISPLAY_PICTURE,
    MEDIA_SELECTOR_UPLOAD_BTN_CAPTION,
    MEDIA_SELECTOR_REMOVE_BTN_CAPTION,
} from "../../ui-config/strings";
import { connect } from "react-redux";
import { actionCreators } from "@courselit/state-management";
import { getBackendAddress, getPage } from "../../ui-lib/utils";
import {
    Checkbox,
    Section,
    Form,
    FormField,
    Button2,
    PageBuilderPropertyHeader,
    MediaSelector,
    Image,
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@courselit/components-library";
import type {
    Address,
    Auth,
    Media,
    Page,
    Profile,
    State,
} from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import BaseLayout from "../../components/public/base-layout";
import { useRouter } from "next/router";
import { FormEvent } from "react";

interface ProfileProps {
    profile: Profile;
    page: Page;
    auth: Auth;
    dispatch: AppDispatch;
    address: Address;
    networkActionState: boolean;
}

function ProfileIndex({
    profile,
    networkActionState,
    page,
    auth,
    dispatch,
    address,
}: ProfileProps) {
    const [bio, setBio] = useState("");
    const [name, setName] = useState("");
    const [user, setUser] =
        useState<Pick<Profile, "bio" | "name" | "avatar">>();
    const [avatar, setAvatar] = useState<Partial<Media>>({});
    const [subscribedToUpdates, setSubscribedToUpdates] = useState(false);
    const { networkAction, refreshUserProfile, setAppMessage } = actionCreators;
    const router = useRouter();

    useEffect(() => {
        if (auth.checked && auth.guest) {
            router.push(`/login?redirect=${router.asPath}`);
        }
    }, [auth.checked]);

    useEffect(() => {
        if (profile.userId) {
            getUser(profile.userId);
        }
    }, [profile]);

    const getUser = async function (userId: string) {
        const query = `
        query {
          user: getUser(userId: "${userId}") {
            name,
            bio,
            email,
            subscribedToUpdates,
            avatar {
                mediaId,
                originalFileName,
                mimeType,
                size,
                access,
                file,
                thumbnail,
                caption
            },
          }
        }
      `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.user) {
                setUser(response.user);
                setName(response.user.name);
                setBio(response.user.bio);
                setAvatar(response.user.avatar);
                setSubscribedToUpdates(response.user.subscribedToUpdates);
            }
        } catch (err: any) {
            console.error(`Profile page: ${err.message}`);
        }
    };

    const updateProfilePic = async (media?: Media) => {
        const mutation = `
          mutation ($id: ID!, $avatar: MediaInput) {
            user: updateUser(userData: {
              id: $id
              avatar: $avatar
            }) {
              id,
              name,
              bio,
               avatar {
                mediaId,
                originalFileName,
                mimeType,
                size,
                access,
                file,
                thumbnail,
                caption
              },
            }
          }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: profile.id,
                    avatar: media || null,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(networkAction(true));
            await fetch.exec();
            dispatch(refreshUserProfile());
            dispatch(setAppMessage(new AppMessage(APP_MESSAGE_CHANGES_SAVED)));
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const saveDetails = async (e: FormEvent) => {
        e.preventDefault();

        const mutation = `
          mutation ($id: ID!, $name: String, $bio: String) {
            user: updateUser(userData: {
              id: $id
              name: $name
              bio: $bio
            }) {
              id,
              name,
              bio,
               avatar {
                mediaId,
                originalFileName,
                mimeType,
                size,
                access,
                file,
                thumbnail,
                caption
              },
            }
          }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: profile.id,
                    name,
                    bio,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(networkAction(true));
            await fetch.exec();
            dispatch(refreshUserProfile());
            dispatch(setAppMessage(new AppMessage(APP_MESSAGE_CHANGES_SAVED)));
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const saveEmailPreference = async function (state: boolean) {
        setSubscribedToUpdates(state);
        const mutation = `
          mutation ($id: ID!, $subscribedToUpdates: Boolean) {
            user: updateUser(userData: {
              id: $id
              subscribedToUpdates: $subscribedToUpdates 
            }) {
                subscribedToUpdates
            }
          }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: profile.id,
                    subscribedToUpdates: state,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            dispatch(networkAction(true));
            await fetch.exec();
        } catch (err: any) {
            setSubscribedToUpdates(!state);
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <BaseLayout layout={page.layout} title={PROFILE_PAGE_HEADER}>
            <div className="mx-auto lg:max-w-[1200px] w-full">
                <div className="flex flex-col p-4 gap-4">
                    <h1 className="text-4xl font-semibold my-4 lg:my-8">
                        {PROFILE_PAGE_HEADER}
                    </h1>
                    <div className="flex flex-col lg:!flex-row gap-4">
                        <Section className="w-full lg:!w-2/6 flex items-center">
                            <PageBuilderPropertyHeader
                                label={PROFILE_SECTION_DISPLAY_PICTURE}
                            />
                            <Avatar className="w-40 h-40 mb-4">
                                <AvatarImage src={avatar?.file} />
                                <AvatarFallback>
                                    <Image
                                        src="/courselit_backdrop_square.webp"
                                        alt="profile pic"
                                        sizes="16vw"
                                        height="h-40"
                                        width="w-40"
                                    />
                                </AvatarFallback>
                            </Avatar>
                            <MediaSelector
                                title=""
                                auth={auth}
                                profile={profile}
                                dispatch={dispatch}
                                address={address}
                                mediaId={avatar?.mediaId}
                                src={avatar?.thumbnail || ""}
                                srcTitle={avatar?.originalFileName || ""}
                                onSelection={(media?: Media) => {
                                    if (media) {
                                        updateProfilePic(media);
                                    }
                                }}
                                onRemove={() => {
                                    updateProfilePic();
                                }}
                                access="public"
                                strings={{
                                    buttonCaption:
                                        MEDIA_SELECTOR_UPLOAD_BTN_CAPTION,
                                    removeButtonCaption:
                                        MEDIA_SELECTOR_REMOVE_BTN_CAPTION,
                                }}
                                type="user"
                                hidePreview={true}
                            />
                        </Section>
                        <Form
                            onSubmit={saveDetails}
                            className="w-full lg:!w-4/6"
                        >
                            <Section header={PROFILE_SECTION_DETAILS}>
                                <FormField
                                    value={profile.email}
                                    label={PROFILE_SECTION_DETAILS_EMAIL}
                                    onChange={() => {}}
                                    disabled={true}
                                />
                                <FormField
                                    name="name"
                                    value={name}
                                    label={PROFILE_SECTION_DETAILS_NAME}
                                    onChange={(event) =>
                                        setName(event.target.value)
                                    }
                                />
                                <FormField
                                    name="bio"
                                    value={bio}
                                    onChange={(event) =>
                                        setBio(event.target.value)
                                    }
                                    label={PROFILE_SECTION_DETAILS_BIO}
                                    multiline={true}
                                    maxRows={5}
                                />
                                <div className="mt-2">
                                    <Button2
                                        onClick={saveDetails}
                                        disabled={
                                            bio === (user && user.bio) &&
                                            name === (user && user.name) &&
                                            avatar === (user && user.avatar)
                                        }
                                    >
                                        {BUTTON_SAVE}
                                    </Button2>
                                </div>
                            </Section>
                        </Form>
                    </div>
                    <Section header={PROFILE_EMAIL_PREFERENCES}>
                        <div className="flex justify-between">
                            <p>
                                {
                                    PROFILE_EMAIL_PREFERENCES_NEWSLETTER_OPTION_TEXT
                                }
                            </p>
                            <Checkbox
                                disabled={networkActionState}
                                checked={subscribedToUpdates}
                                onChange={(value: boolean) =>
                                    saveEmailPreference(value)
                                }
                            />
                        </div>
                    </Section>
                </div>
            </div>
        </BaseLayout>
    );
}

export async function getServerSideProps(context: any) {
    const { req } = context;
    const address = getBackendAddress(req.headers);
    const page = await getPage(address);
    if (!page) {
        return {
            notFound: true,
        };
    }
    return { props: { page } };
}

const mapStateToProps = (state: State) => ({
    profile: state.profile,
    auth: state.auth,
    address: state.address,
    networkActionState: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(ProfileIndex);
