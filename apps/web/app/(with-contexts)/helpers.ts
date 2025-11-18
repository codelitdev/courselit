import { FetchBuilder } from "@courselit/utils";

export const getUserProfile = async (address: string) => {
    const query = `
        { profile: getUser {
            name,
            id,
            email,
            userId,
            bio,
            permissions,
            purchases {
                courseId
                completedLessons
                accessibleGroups
                certificateId
            }
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
        .setUrl(`${address}/api/graph`)
        .setPayload(query)
        .setIsGraphQLEndpoint(true)
        .build();
    const response = await fetch.exec();
    return response.profile;
};
