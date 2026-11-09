/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CommunityModel from "@models/Community";
import { auth } from "@/auth";
import * as medialitService from "@/services/medialit";
import { UIConstants } from "@courselit/common-models";

jest.mock("@models/Domain");
jest.mock("@models/User");
jest.mock("@models/Community");
jest.mock("@models/Course");
jest.mock("@models/Lesson");
jest.mock("@models/Page");
jest.mock("@models/CertificateTemplate");
jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn(),
}));
jest.mock("@/auth", () => ({
    auth: {
        api: {
            getSession: jest.fn(),
        },
    },
}));

const { permissions } = UIConstants;

const domain = {
    _id: "domain-id",
    name: "school",
    settings: {
        logo: { mediaId: "school-logo" },
    },
};

function request() {
    return {
        headers: {
            get: jest.fn((name: string) =>
                name === "domain" ? "school" : null,
            ),
        },
    } as unknown as NextRequest;
}

async function callDelete(mediaId: string, type: string) {
    const { DELETE } = await import("../route");
    return DELETE(request(), {
        params: Promise.resolve({ mediaId, type }),
    });
}

function signInAs(user: Record<string, unknown>) {
    (auth.api.getSession as unknown as jest.Mock).mockResolvedValue({
        user: { email: "admin@example.com" },
    });
    (UserModel.findOne as jest.Mock).mockResolvedValue({
        userId: "admin",
        email: "admin@example.com",
        ...user,
    });
}

describe("DELETE /api/media/[mediaId]/[type]", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (DomainModel.findOne as jest.Mock).mockResolvedValue(domain);
        (medialitService.deleteMedia as jest.Mock).mockResolvedValue(true);
    });

    describe("domain media", () => {
        const settingsAdmin = {
            permissions: [permissions.manageMedia, permissions.manageSettings],
        };

        it("deletes the current school's logo", async () => {
            signInAs(settingsAdmin);

            const response = await callDelete("school-logo", "domain");

            expect(response.status).toBe(200);
            expect(medialitService.deleteMedia).toHaveBeenCalledWith(
                "school-logo",
            );
        });

        it("refuses to delete media that is not the current school's logo", async () => {
            signInAs(settingsAdmin);

            const response = await callDelete("other-school-logo", "domain");

            expect(response.status).toBe(403);
            expect(medialitService.deleteMedia).not.toHaveBeenCalled();
        });
    });

    describe("community media", () => {
        const communityAdmin = {
            permissions: [permissions.manageMedia, permissions.manageCommunity],
        };

        it("deletes a featured image of a community in the current school", async () => {
            signInAs(communityAdmin);
            (CommunityModel.exists as jest.Mock).mockResolvedValue({
                _id: "community",
            });

            const response = await callDelete("community-image", "community");

            expect(response.status).toBe(200);
            expect(CommunityModel.exists).toHaveBeenCalledWith({
                domain: domain._id,
                "featuredImage.mediaId": "community-image",
            });
            expect(medialitService.deleteMedia).toHaveBeenCalledWith(
                "community-image",
            );
        });

        it("refuses to delete media not used by a community in the current school", async () => {
            signInAs(communityAdmin);
            (CommunityModel.exists as jest.Mock).mockResolvedValue(null);

            const response = await callDelete("foreign-image", "community");

            expect(response.status).toBe(403);
            expect(medialitService.deleteMedia).not.toHaveBeenCalled();
        });
    });

    describe("user media", () => {
        it("lets users delete their own avatar", async () => {
            signInAs({
                permissions: [permissions.manageMedia],
                avatar: { mediaId: "my-avatar" },
            });

            const response = await callDelete("my-avatar", "user");

            expect(response.status).toBe(200);
            expect(UserModel.exists).not.toHaveBeenCalled();
            expect(medialitService.deleteMedia).toHaveBeenCalledWith(
                "my-avatar",
            );
        });

        it("refuses to delete an avatar that does not belong to a user in the current school", async () => {
            signInAs({
                permissions: [permissions.manageMedia, permissions.manageUsers],
            });
            (UserModel.exists as jest.Mock).mockResolvedValue(null);

            const response = await callDelete("foreign-avatar", "user");

            expect(response.status).toBe(403);
            expect(UserModel.exists).toHaveBeenCalledWith({
                domain: domain._id,
                "avatar.mediaId": "foreign-avatar",
            });
            expect(medialitService.deleteMedia).not.toHaveBeenCalled();
        });
    });
});
