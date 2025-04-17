/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { POST } from "../route";
import Domain from "@models/Domain";
import { auth } from "@/auth";
import mongoose from "mongoose";
import User from "@models/User";
import { Constants } from "@courselit/common-models";
import Course from "@models/Course";

jest.mock("@models/Domain");
jest.mock("@models/User");
jest.mock("@models/Course");
jest.mock("@/auth");

describe("Payment Initiate Route", () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
        jest.clearAllMocks();

        (Domain.findOne as jest.Mock).mockResolvedValue({
            _id: new mongoose.Types.ObjectId("666666666666666666666666"),
            settings: {},
        });

        (User.findOne as jest.Mock).mockResolvedValue({
            userId: "tester",
            name: "Tester",
            active: true,
            domain: new mongoose.Types.ObjectId("666666666666666666666666"),
        });
        mockRequest = {
            json: jest.fn().mockResolvedValue({
                id: "course-123",
                type: Constants.MembershipEntityType.COURSE,
                planId: "planA",
            }),
            headers: {
                get: jest.fn().mockResolvedValue("test.com"),
            },
        } as unknown as NextRequest;

        (auth as jest.Mock).mockResolvedValue({
            user: {
                email: "test@test.com",
            },
        });

        // (getUser as jest.Mock).mockResolvedValue({
        //     userId: 'tester',
        //     name: 'Tester',
        //     active: true,
        //     domain: new mongoose.Types.ObjectId("666666666666666666666666"),
        // })

        // (getUser as jest.Mock).mockResolvedValue({
        //     userId: 'tester',
        //     name: 'Tester',
        //     active: true,
        //     domain: new mongoose.Types.ObjectId("666666666666666666666666"),
        // });
    });

    it("returns 401 if user is not authenticated", async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const response = await POST(mockRequest);
        expect(response.status).toBe(401);
    });

    it("returns 400 if id is missing", async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
            type: Constants.MembershipEntityType.COURSE,
            planId: "planA",
        });

        const response = await POST(mockRequest);
        expect(response.status).toBe(400);
    });

    it("returns 400 if type is missing", async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
            id: "course-123",
            planId: "planA",
        });

        const response = await POST(mockRequest);
        expect(response.status).toBe(400);
    });

    it("returns 400 if planId is missing", async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
            id: "course-123",
            type: Constants.MembershipEntityType.COURSE,
        });

        const response = await POST(mockRequest);
        expect(response.status).toBe(400);
    });

    it("returns 404 if payment plan does not belong to the entity", async () => {
        mockRequest.json = jest.fn().mockResolvedValue({
            id: "course-123",
            type: Constants.MembershipEntityType.COURSE,
            planId: "planA",
        });
        (Course.findOne as jest.Mock).mockResolvedValue({
            title: "Test Course",
            paymentPlans: ["planC", "planB"],
        });
        const response = await POST(mockRequest);
        expect(response.status).toBe(404);
    });
});
