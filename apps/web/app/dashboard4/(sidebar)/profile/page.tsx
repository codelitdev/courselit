"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext, ProfileContext } from "@components/contexts";
import { Media, Profile } from "@courselit/common-models";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Button2,
    Checkbox,
    Form,
    FormField,
    Image,
    MediaSelector,
    PageBuilderPropertyHeader,
    Section,
} from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    BUTTON_SAVE,
    MEDIA_SELECTOR_REMOVE_BTN_CAPTION,
    MEDIA_SELECTOR_UPLOAD_BTN_CAPTION,
    PROFILE_EMAIL_PREFERENCES,
    PROFILE_EMAIL_PREFERENCES_NEWSLETTER_OPTION_TEXT,
    PROFILE_PAGE_HEADER,
    PROFILE_SECTION_DETAILS,
    PROFILE_SECTION_DETAILS_BIO,
    PROFILE_SECTION_DETAILS_EMAIL,
    PROFILE_SECTION_DETAILS_NAME,
    PROFILE_SECTION_DISPLAY_PICTURE,
} from "@ui-config/strings";
import { FormEvent, useContext, useEffect, useState } from "react";

const breadcrumbs = [{ label: PROFILE_PAGE_HEADER, href: "#" }];

export default function Page() {
    const [bio, setBio] = useState("");
    const [name, setName] = useState("");
    const [user, setUser] =
        useState<Pick<Profile, "bio" | "name" | "avatar">>();
    const [avatar, setAvatar] = useState<Partial<Media>>({});
    const [subscribedToUpdates, setSubscribedToUpdates] = useState(false);

    const profile = useContext(ProfileContext);
    const address = useContext(AddressContext);

    useEffect(() => {
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
        if (profile.userId && address.backend) {
            getUser(profile.userId);
        }
    }, [profile, address.backend]);

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
            await fetch.exec();
        } catch (err: any) {
            console.error(err);
        } finally {
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
            await fetch.exec();
        } catch (err: any) {
            console.error(err);
        } finally {
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
            await fetch.exec();
        } catch (err: any) {
            setSubscribedToUpdates(!state);
            console.error(err);
        } finally {
        }
    };

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <h1 className="text-4xl font-semibold mb-2">
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
                        profile={profile as Profile}
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
                            buttonCaption: MEDIA_SELECTOR_UPLOAD_BTN_CAPTION,
                            removeButtonCaption:
                                MEDIA_SELECTOR_REMOVE_BTN_CAPTION,
                        }}
                        type="user"
                        hidePreview={true}
                    />
                </Section>
                <Form onSubmit={saveDetails} className="w-full lg:!w-4/6">
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
                            onChange={(event) => setName(event.target.value)}
                        />
                        <FormField
                            name="bio"
                            value={bio}
                            onChange={(event) => setBio(event.target.value)}
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
                    <p>{PROFILE_EMAIL_PREFERENCES_NEWSLETTER_OPTION_TEXT}</p>
                    <Checkbox
                        checked={subscribedToUpdates}
                        onChange={(value: boolean) =>
                            saveEmailPreference(value)
                        }
                    />
                </div>
            </Section>
        </DashboardContent>
    );
}
