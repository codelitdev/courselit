/**
 * @jest-environment node
 */

import mongoose from "mongoose";
import {
    processOngoingSequence,
    getNextPublishedEmail,
} from "../process-ongoing-sequences/process-ongoing-sequence";
import OngoingSequenceModel from "../model/ongoing-sequence";
import DomainModel, { DomainDocument } from "../model/domain";
import SequenceModel from "../model/sequence";
import UserModel from "../model/user";
import EmailDelivery from "../model/email-delivery";
import * as queries from "../queries";
import * as mail from "../../mail";
import { AdminSequence, InternalUser } from "@courselit/common-logic";
import { jwtUtils } from "@courselit/utils";
import { getUnsubLink } from "../../utils/get-unsub-link";
import { getSiteUrl } from "../../utils/get-site-url";
import { sequenceBounceLimit } from "../../constants";

// Mock dependencies
jest.mock("../../mail");
jest.mock("@courselit/utils");
jest.mock("../../utils/get-unsub-link");
jest.mock("../../utils/get-site-url");
jest.mock("../../logger", () => ({
    logger: {
        error: jest.fn(),
    },
}));

// Mock liquidjs - actually process basic Liquid templates for testing
jest.mock("liquidjs", () => {
    return {
        Liquid: jest.fn().mockImplementation(() => ({
            parseAndRender: jest.fn(async (template: string, payload: any) => {
                // Simple Liquid template processing for tests
                let result = template;
                if (payload) {
                    // Replace {{subscriber.name}}
                    if (payload.subscriber?.name) {
                        result = result.replace(
                            /\{\{subscriber\.name\}\}/g,
                            payload.subscriber.name,
                        );
                    }
                    // Replace {{subscriber.email}}
                    if (payload.subscriber?.email) {
                        result = result.replace(
                            /\{\{subscriber\.email\}\}/g,
                            payload.subscriber.email,
                        );
                    }
                    // Replace {{unsubscribe_link}}
                    if (payload.unsubscribe_link) {
                        result = result.replace(
                            /\{\{unsubscribe_link\}\}/g,
                            payload.unsubscribe_link,
                        );
                    }
                    // Replace {{address}}
                    if (payload.address) {
                        result = result.replace(
                            /\{\{address\}\}/g,
                            payload.address,
                        );
                    }
                }
                return result;
            }),
        })),
    };
});

const mockedSendMail = mail.sendMail as jest.MockedFunction<
    typeof mail.sendMail
>;
const mockedJwtUtils = jwtUtils as jest.Mocked<typeof jwtUtils>;
const mockedGetUnsubLink = getUnsubLink as jest.MockedFunction<
    typeof getUnsubLink
>;
const mockedGetSiteUrl = getSiteUrl as jest.MockedFunction<typeof getSiteUrl>;

const TEST_DOMAIN_NAME = "queue-test-domain";
const TEST_SEQUENCE_ID = "queue-sequence-123";
const TEST_USER_ID = "queue-user-123";
const TEST_CREATOR_ID = "queue-creator-123";

describe("processOngoingSequence", () => {
    let testDomain: DomainDocument;
    let testSequence: AdminSequence;
    let testUser: InternalUser;
    let testCreator: InternalUser;

    beforeAll(async () => {
        // Set required environment variables
        process.env.PIXEL_SIGNING_SECRET = "test-secret";
        process.env.PROTOCOL = "https";
        process.env.DOMAIN = "test.com";
        process.env.NODE_ENV = "test";

        // Create test domain
        testDomain = await (DomainModel.create as any)({
            name: TEST_DOMAIN_NAME,
            settings: {
                mailingAddress: "test@example.com",
            },
            quota: {
                mail: {
                    daily: 1000,
                    monthly: 30000,
                    dailyCount: 0,
                    monthlyCount: 0,
                },
            },
        });

        // Create test users
        testUser = (await (UserModel.create as any)({
            userId: TEST_USER_ID,
            name: "Queue Test User",
            email: "queue-user@example.com",
            active: true,
            subscribedToUpdates: true,
            unsubscribeToken: "unsub-token-123",
            tags: [],
            domain: testDomain._id,
        })) as any;

        testCreator = (await (UserModel.create as any)({
            userId: TEST_CREATOR_ID,
            name: "Queue Test Creator",
            email: "queue-creator@example.com",
            active: true,
            subscribedToUpdates: true,
            unsubscribeToken: "unsub-token-creator",
            tags: [],
            domain: testDomain._id,
        })) as any;

        // Create test sequence
        testSequence = (await (SequenceModel.create as any)({
            domain: testDomain._id,
            sequenceId: TEST_SEQUENCE_ID,
            creatorId: TEST_CREATOR_ID,
            type: "sequence",
            emails: [
                {
                    emailId: "email-1",
                    subject: "First Email",
                    published: true,
                    delayInMillis: 86400000, // 1 day
                    content: {
                        content: [
                            {
                                id: "block-1",
                                blockType: "text",
                                settings: {
                                    content: "Hello {{subscriber.name}}",
                                },
                            },
                        ],
                        style: {
                            colors: {
                                background: "#ffffff",
                                foreground: "#000000",
                                border: "#e2e8f0",
                                accent: "#0284c7",
                                accentForeground: "#ffffff",
                            },
                            typography: {
                                header: {
                                    fontFamily: "Arial, sans-serif",
                                },
                                text: {
                                    fontFamily: "Arial, sans-serif",
                                },
                                link: {
                                    fontFamily: "Arial, sans-serif",
                                },
                            },
                            interactives: {
                                button: {},
                                link: {},
                            },
                            structure: {
                                page: {
                                    marginY: "20px",
                                },
                                section: {
                                    padding: {
                                        x: "24px",
                                        y: "16px",
                                    },
                                },
                            },
                        },
                        meta: {},
                    },
                },
                {
                    emailId: "email-2",
                    subject: "Second Email",
                    published: true,
                    delayInMillis: 86400000, // 1 day
                    content: {
                        content: [
                            {
                                id: "block-1",
                                blockType: "text",
                                settings: { content: "Second email content" },
                            },
                        ],
                        style: {
                            colors: {
                                background: "#ffffff",
                                foreground: "#000000",
                                border: "#e2e8f0",
                                accent: "#0284c7",
                                accentForeground: "#ffffff",
                            },
                            typography: {
                                header: {
                                    fontFamily: "Arial, sans-serif",
                                },
                                text: {
                                    fontFamily: "Arial, sans-serif",
                                },
                                link: {
                                    fontFamily: "Arial, sans-serif",
                                },
                            },
                            interactives: {
                                button: {},
                                link: {},
                            },
                            structure: {
                                page: {
                                    marginY: "20px",
                                },
                                section: {
                                    padding: {
                                        x: "24px",
                                        y: "16px",
                                    },
                                },
                            },
                        },
                        meta: {},
                    },
                },
            ],
            emailsOrder: ["email-1", "email-2"],
            report: {
                sequence: {
                    failed: [],
                },
            },
        })) as any;

        // Setup mocks
        mockedGetSiteUrl.mockReturnValue("https://test.com");
        mockedGetUnsubLink.mockReturnValue(
            "https://test.com/api/unsubscribe/unsub-token-123",
        );
        mockedJwtUtils.generateToken = jest.fn().mockReturnValue("test-token");
        // renderEmailToHtml is not mocked - we test the real email formatting
        mockedSendMail.mockResolvedValue(undefined);
    });

    beforeEach(async () => {
        // Clean up only test-specific data, preserve testDomain, testUser, testCreator, testSequence
        await OngoingSequenceModel.deleteMany({
            _id: { $ne: testDomain._id }, // Keep test domain
        });
        await EmailDelivery.deleteMany({});
        // Clean up any sequences/ongoing sequences created during tests
        await OngoingSequenceModel.deleteMany({
            sequenceId: { $ne: TEST_SEQUENCE_ID }, // Keep main test sequence
        });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await DomainModel.deleteMany({});
        await UserModel.deleteMany({});
        await SequenceModel.deleteMany({});
        await OngoingSequenceModel.deleteMany({});
        await EmailDelivery.deleteMany({});
    });

    describe("processOngoingSequence", () => {
        it("should return early if ongoing sequence is not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const getDomainSpy = jest.spyOn(queries, "getDomain");

            await processOngoingSequence(nonExistentId);

            // Should not throw and should not call any queries
            expect(getDomainSpy).not.toHaveBeenCalled();
        });

        it("should return early if domain is invalid (missing mailingAddress)", async () => {
            const invalidDomain = await (DomainModel.create as any)({
                name: "invalid-domain",
                settings: {}, // Missing mailingAddress
                quota: {
                    mail: {
                        daily: 1000,
                        monthly: 30000,
                        dailyCount: 0,
                        monthlyCount: 0,
                    },
                },
            });

            const ongoingSeq = await OngoingSequenceModel.create({
                domain: invalidDomain._id,
                sequenceId: TEST_SEQUENCE_ID,
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: [],
            });

            jest.spyOn(queries, "getDomain").mockResolvedValue(invalidDomain);

            await processOngoingSequence(ongoingSeq._id as any);

            // Should not send email
            expect(mockedSendMail).not.toHaveBeenCalled();

            await DomainModel.deleteOne({ _id: invalidDomain._id });
            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
        });

        it("should return early if quota is exceeded", async () => {
            const quotaExceededDomain = await (DomainModel.create as any)({
                name: "quota-domain",
                settings: {
                    mailingAddress: "test@example.com",
                },
                quota: {
                    mail: {
                        daily: 1000,
                        monthly: 30000,
                        dailyCount: 1000, // At limit
                        monthlyCount: 0,
                    },
                },
            });

            const ongoingSeq = await OngoingSequenceModel.create({
                domain: quotaExceededDomain._id,
                sequenceId: TEST_SEQUENCE_ID,
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: [],
            });

            jest.spyOn(queries, "getDomain").mockResolvedValue(
                quotaExceededDomain,
            );

            await processOngoingSequence(ongoingSeq._id as any);

            // Should not send email
            expect(mockedSendMail).not.toHaveBeenCalled();

            await DomainModel.deleteOne({ _id: quotaExceededDomain._id });
            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
        });

        it("should clean up resources if sequence is missing", async () => {
            const ongoingSeq = await OngoingSequenceModel.create({
                domain: testDomain._id,
                sequenceId: "nonexistent-sequence",
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: [],
            });

            jest.spyOn(queries, "getDomain").mockResolvedValue(testDomain);
            jest.spyOn(queries, "getSequence").mockResolvedValue(null);
            const deleteSpy = jest
                .spyOn(queries, "deleteOngoingSequence")
                .mockResolvedValue(undefined);

            await processOngoingSequence(ongoingSeq._id as any);

            // Should clean up
            expect(deleteSpy).toHaveBeenCalledWith("nonexistent-sequence");

            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
        });

        it("should clean up resources if user is missing", async () => {
            const ongoingSeq = await OngoingSequenceModel.create({
                domain: testDomain._id,
                sequenceId: TEST_SEQUENCE_ID,
                userId: "nonexistent-user",
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: [],
            });

            jest.spyOn(queries, "getDomain").mockResolvedValue(testDomain);
            jest.spyOn(queries, "getSequence").mockResolvedValue(testSequence);
            jest.spyOn(queries, "getUser")
                .mockResolvedValueOnce(null) // User not found
                .mockResolvedValueOnce(testCreator);
            const deleteSpy = jest
                .spyOn(queries, "deleteOngoingSequence")
                .mockResolvedValue(undefined);

            await processOngoingSequence(ongoingSeq._id as any);

            // Should clean up
            expect(deleteSpy).toHaveBeenCalled();

            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
        });

        it("should successfully send email and schedule next one", async () => {
            const ongoingSeq = await OngoingSequenceModel.create({
                domain: testDomain._id,
                sequenceId: TEST_SEQUENCE_ID,
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: [],
            });

            // Get fresh references to avoid stale document issues
            const freshDomain = await (DomainModel.findById as any)(
                testDomain._id,
            );
            const freshSequence = await (SequenceModel.findOne as any)({
                sequenceId: TEST_SEQUENCE_ID,
            });
            const freshUser = await (UserModel.findOne as any)({
                userId: TEST_USER_ID,
            });
            const freshCreator = await (UserModel.findOne as any)({
                userId: TEST_CREATOR_ID,
            });

            if (!freshDomain || !freshSequence || !freshUser || !freshCreator) {
                throw new Error("Failed to get fresh references");
            }

            jest.spyOn(queries, "getDomain").mockResolvedValue(freshDomain);
            jest.spyOn(queries, "getSequence").mockResolvedValue(
                freshSequence as any,
            );
            jest.spyOn(queries, "getUser")
                .mockResolvedValueOnce(freshUser as any)
                .mockResolvedValueOnce(freshCreator as any);

            await processOngoingSequence(ongoingSeq._id as any);

            // Verify email was sent
            expect(mockedSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: expect.stringContaining("queue-creator@example.com"),
                    to: "queue-user@example.com",
                    subject: "First Email",
                    html: expect.any(String),
                }),
            );

            // Verify email delivery was created
            const emailDelivery = await (EmailDelivery.findOne as any)({
                sequenceId: TEST_SEQUENCE_ID,
                userId: TEST_USER_ID,
                emailId: "email-1",
            });
            expect(emailDelivery).toBeTruthy();

            // Verify ongoing sequence was updated
            const updatedSeq = await OngoingSequenceModel.findById(
                ongoingSeq._id,
            );
            expect(updatedSeq?.sentEmailIds).toContain("email-1");
            expect(updatedSeq?.nextEmailScheduledTime).toBeGreaterThan(
                Date.now(),
            );

            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
            await EmailDelivery.deleteMany({});
        });

        it("should complete sequence when all emails are sent", async () => {
            const ongoingSeq = await OngoingSequenceModel.create({
                domain: testDomain._id,
                sequenceId: TEST_SEQUENCE_ID,
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: ["email-1"], // First email already sent
            });

            // Get fresh references
            const freshDomain = await (DomainModel.findById as any)(
                testDomain._id,
            );
            const freshSequence = await (SequenceModel.findOne as any)({
                sequenceId: TEST_SEQUENCE_ID,
            });
            const freshUser = await (UserModel.findOne as any)({
                userId: TEST_USER_ID,
            });
            const freshCreator = await (UserModel.findOne as any)({
                userId: TEST_CREATOR_ID,
            });

            if (!freshDomain || !freshSequence || !freshUser || !freshCreator) {
                throw new Error("Failed to get fresh references");
            }

            jest.spyOn(queries, "getDomain").mockResolvedValue(freshDomain);
            jest.spyOn(queries, "getSequence").mockResolvedValue(
                freshSequence as any,
            );
            jest.spyOn(queries, "getUser")
                .mockResolvedValueOnce(freshUser as any)
                .mockResolvedValueOnce(freshCreator as any);
            const deleteSpy = jest
                .spyOn(queries, "deleteOngoingSequence")
                .mockResolvedValue(undefined);

            await processOngoingSequence(ongoingSeq._id as any);

            // Should send second email
            expect(mockedSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: "Second Email",
                }),
            );

            // Should clean up after completion
            expect(deleteSpy).toHaveBeenCalled();

            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
        });

        it("should handle sendMail errors and increment retry count", async () => {
            const ongoingSeq = await OngoingSequenceModel.create({
                domain: testDomain._id,
                sequenceId: TEST_SEQUENCE_ID,
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: [],
            });

            const error = new Error("SMTP Error");
            mockedSendMail.mockRejectedValueOnce(error);

            jest.spyOn(queries, "getDomain").mockResolvedValue(testDomain);
            jest.spyOn(queries, "getSequence").mockResolvedValue(testSequence);
            jest.spyOn(queries, "getUser")
                .mockResolvedValueOnce(testUser)
                .mockResolvedValueOnce(testCreator);

            await expect(
                processOngoingSequence(ongoingSeq._id as any),
            ).rejects.toThrow("SMTP Error");

            // Verify retry count was incremented
            const updatedSeq = await OngoingSequenceModel.findById(
                ongoingSeq._id,
            );
            expect(updatedSeq?.retryCount).toBe(1);

            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
        });

        it("should delete ongoing sequence when retry limit is exceeded", async () => {
            const ongoingSeq = await OngoingSequenceModel.create({
                domain: testDomain._id,
                sequenceId: TEST_SEQUENCE_ID,
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: sequenceBounceLimit - 1, // One less than limit
                sentEmailIds: [],
            });

            const error = new Error("SMTP Error");
            mockedSendMail.mockRejectedValueOnce(error);

            // Get fresh references - especially important for sequence to avoid version conflicts
            const freshDomain = await (DomainModel.findById as any)(
                testDomain._id,
            );
            const freshSequence = await (SequenceModel.findOne as any)({
                sequenceId: TEST_SEQUENCE_ID,
            });
            const freshUser = await (UserModel.findOne as any)({
                userId: TEST_USER_ID,
            });
            const freshCreator = await (UserModel.findOne as any)({
                userId: TEST_CREATOR_ID,
            });

            if (!freshDomain || !freshSequence || !freshUser || !freshCreator) {
                throw new Error("Failed to get fresh references");
            }

            jest.spyOn(queries, "getDomain").mockResolvedValue(freshDomain);
            jest.spyOn(queries, "getSequence").mockResolvedValue(
                freshSequence as any,
            );
            jest.spyOn(queries, "getUser")
                .mockResolvedValueOnce(freshUser as any)
                .mockResolvedValueOnce(freshCreator as any);
            const deleteSpy = jest
                .spyOn(queries, "deleteOngoingSequence")
                .mockResolvedValue(undefined);

            await expect(
                processOngoingSequence(ongoingSeq._id as any),
            ).rejects.toThrow("SMTP Error");

            // Should delete after exceeding retry limit
            expect(deleteSpy).toHaveBeenCalled();

            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
        });

        it("should return early if email has no content", async () => {
            // Create sequence with valid content first, then modify in memory
            const sequenceWithoutContent = (await (SequenceModel.create as any)(
                {
                    domain: testDomain._id,
                    sequenceId: "sequence-no-content",
                    creatorId: TEST_CREATOR_ID,
                    type: "sequence",
                    emails: [
                        {
                            emailId: "email-no-content",
                            subject: "No Content Email",
                            published: true,
                            delayInMillis: 86400000,
                            content: {
                                content: [],
                                style: {
                                    structure: {},
                                    typography: {},
                                    colors: {},
                                },
                                meta: {},
                            },
                        },
                    ],
                    emailsOrder: ["email-no-content"],
                    report: {
                        sequence: {
                            failed: [],
                        },
                    },
                },
            )) as any;

            // Set content to undefined after creation (simulating missing content)
            sequenceWithoutContent.emails[0].content = undefined;

            const ongoingSeq = await OngoingSequenceModel.create({
                domain: testDomain._id,
                sequenceId: "sequence-no-content",
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: [],
            });

            // Use testDomain, testUser, testCreator directly since they're created in beforeAll
            // and persist across tests (cleanup only clears collections, not the test data)
            jest.spyOn(queries, "getDomain").mockResolvedValue(testDomain);
            jest.spyOn(queries, "getSequence").mockResolvedValue(
                sequenceWithoutContent,
            );
            jest.spyOn(queries, "getUser")
                .mockResolvedValueOnce(testUser)
                .mockResolvedValueOnce(testCreator);

            await processOngoingSequence(ongoingSeq._id as any);

            // Should not send email
            expect(mockedSendMail).not.toHaveBeenCalled();

            await SequenceModel.deleteOne({
                sequenceId: "sequence-no-content",
            });
            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
        });
    });

    describe("Mail rendering", () => {
        it("should render email content with Liquid templates", async () => {
            // Create a sequence with Liquid template variables in the email content
            const sequenceWithTemplates = (await (SequenceModel.create as any)({
                domain: testDomain._id,
                sequenceId: "sequence-templates",
                creatorId: TEST_CREATOR_ID,
                type: "sequence",
                emails: [
                    {
                        emailId: "email-template",
                        subject: "Hello {{subscriber.name}}",
                        published: true,
                        delayInMillis: 86400000,
                        content: {
                            content: [
                                {
                                    id: "block-1",
                                    blockType: "text",
                                    settings: {
                                        content:
                                            "Hello {{subscriber.name}}, your email is {{subscriber.email}}. Unsubscribe: {{unsubscribe_link}}",
                                    },
                                },
                            ],
                            style: {
                                colors: {
                                    background: "#ffffff",
                                    foreground: "#000000",
                                    border: "#e2e8f0",
                                    accent: "#0284c7",
                                    accentForeground: "#ffffff",
                                },
                                typography: {
                                    header: {
                                        fontFamily: "Arial, sans-serif",
                                    },
                                    text: {
                                        fontFamily: "Arial, sans-serif",
                                    },
                                    link: {
                                        fontFamily: "Arial, sans-serif",
                                    },
                                },
                                interactives: {
                                    button: {},
                                    link: {},
                                },
                                structure: {
                                    page: {
                                        marginY: "20px",
                                    },
                                    section: {
                                        padding: {
                                            x: "24px",
                                            y: "16px",
                                        },
                                    },
                                },
                            },
                            meta: {},
                        },
                    },
                ],
                emailsOrder: ["email-template"],
                report: {
                    sequence: {
                        failed: [],
                    },
                },
            })) as any;

            const ongoingSeq = await OngoingSequenceModel.create({
                domain: testDomain._id,
                sequenceId: "sequence-templates",
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: [],
            });

            // Get fresh references
            const freshDomain = await (DomainModel.findById as any)(
                testDomain._id,
            );
            const freshSequence = await (SequenceModel.findOne as any)({
                sequenceId: "sequence-templates",
            });
            const freshUser = await (UserModel.findOne as any)({
                userId: TEST_USER_ID,
            });
            const freshCreator = await (UserModel.findOne as any)({
                userId: TEST_CREATOR_ID,
            });

            if (!freshDomain || !freshSequence || !freshUser || !freshCreator) {
                throw new Error("Failed to get fresh references");
            }

            jest.spyOn(queries, "getDomain").mockResolvedValue(freshDomain);
            jest.spyOn(queries, "getSequence").mockResolvedValue(
                freshSequence as any,
            );
            jest.spyOn(queries, "getUser")
                .mockResolvedValueOnce(freshUser as any)
                .mockResolvedValueOnce(freshCreator as any);

            await processOngoingSequence(ongoingSeq._id as any);

            // Verify email was sent
            expect(mockedSendMail).toHaveBeenCalled();
            const sendMailCall = mockedSendMail.mock.calls[0][0];
            const htmlContent = sendMailCall.html;

            // Verify renderEmailToHtml produced valid HTML (not an error)
            expect(htmlContent).not.toContain("<h1>Error:");
            expect(htmlContent).toContain("<!DOCTYPE html>");
            expect(htmlContent).toContain("<html");
            expect(htmlContent).toContain("<body");

            // Verify Liquid templates were rendered in the actual HTML
            expect(htmlContent).toContain("Queue Test User"); // subscriber.name should be rendered
            expect(htmlContent).toContain("queue-user@example.com"); // subscriber.email should be rendered
            expect(htmlContent).toContain("https://test.com/api/unsubscribe"); // unsubscribe_link should be rendered
            // Verify the template variables are NOT present (they should be replaced)
            expect(htmlContent).not.toContain("{{subscriber.name}}");
            expect(htmlContent).not.toContain("{{subscriber.email}}");
            expect(htmlContent).not.toContain("{{unsubscribe_link}}");

            await SequenceModel.deleteOne({
                sequenceId: "sequence-templates",
            });
            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
            await EmailDelivery.deleteMany({});
        });

        it("should rewrite links for click tracking", async () => {
            // Create a sequence with links in the content
            await (SequenceModel.create as any)({
                domain: testDomain._id,
                sequenceId: "sequence-links",
                creatorId: TEST_CREATOR_ID,
                type: "sequence",
                emails: [
                    {
                        emailId: "email-links",
                        subject: "Email with Links",
                        published: true,
                        delayInMillis: 86400000,
                        content: {
                            content: [
                                {
                                    id: "block-1",
                                    blockType: "text",
                                    settings: {
                                        content: "Check out our website",
                                    },
                                },
                                {
                                    id: "block-2",
                                    blockType: "link",
                                    settings: {
                                        url: "https://example.com/page1",
                                        text: "Link 1",
                                    },
                                },
                                {
                                    id: "block-3",
                                    blockType: "link",
                                    settings: {
                                        url: "https://example.com/page2",
                                        text: "Link 2",
                                    },
                                },
                            ],
                            style: {
                                colors: {
                                    background: "#ffffff",
                                    foreground: "#000000",
                                    border: "#e2e8f0",
                                    accent: "#0284c7",
                                    accentForeground: "#ffffff",
                                },
                                typography: {
                                    header: {
                                        fontFamily: "Arial, sans-serif",
                                    },
                                    text: {
                                        fontFamily: "Arial, sans-serif",
                                    },
                                    link: {
                                        fontFamily: "Arial, sans-serif",
                                    },
                                },
                                interactives: {
                                    button: {},
                                    link: {},
                                },
                                structure: {
                                    page: {
                                        marginY: "20px",
                                    },
                                    section: {
                                        padding: {
                                            x: "24px",
                                            y: "16px",
                                        },
                                    },
                                },
                            },
                            meta: {},
                        },
                    },
                ],
                emailsOrder: ["email-links"],
                report: {
                    sequence: {
                        failed: [],
                    },
                },
            });

            const ongoingSeq = await OngoingSequenceModel.create({
                domain: testDomain._id,
                sequenceId: "sequence-links",
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: [],
            });

            // Get fresh references
            const freshDomain = await (DomainModel.findById as any)(
                testDomain._id,
            );
            const freshSequence = await (SequenceModel.findOne as any)({
                sequenceId: "sequence-links",
            });
            const freshUser = await (UserModel.findOne as any)({
                userId: TEST_USER_ID,
            });
            const freshCreator = await (UserModel.findOne as any)({
                userId: TEST_CREATOR_ID,
            });

            if (!freshDomain || !freshSequence || !freshUser || !freshCreator) {
                throw new Error("Failed to get fresh references");
            }

            jest.spyOn(queries, "getDomain").mockResolvedValue(freshDomain);
            jest.spyOn(queries, "getSequence").mockResolvedValue(
                freshSequence as any,
            );
            jest.spyOn(queries, "getUser")
                .mockResolvedValueOnce(freshUser as any)
                .mockResolvedValueOnce(freshCreator as any);

            await processOngoingSequence(ongoingSeq._id as any);

            // Verify email was sent
            expect(mockedSendMail).toHaveBeenCalled();
            const sendMailCall = mockedSendMail.mock.calls[0][0];
            const htmlContent = sendMailCall.html;

            // Verify renderEmailToHtml produced valid HTML (not an error)
            expect(htmlContent).not.toContain("<h1>Error:");
            expect(htmlContent).toContain("<!DOCTYPE html>");
            expect(htmlContent).toContain("<html");

            // Verify links were rewritten for click tracking in the actual HTML
            // Links should be in <a> tags with tracking URLs
            expect(htmlContent).toContain("/api/track/click?d=");
            expect(htmlContent).toContain("https://test.com/api/track/click");
            // Original URLs should NOT be directly in the HTML (they should be in the token)
            // But the tracking URLs should be present
            expect(htmlContent).toMatch(
                /href=["']https:\/\/test\.com\/api\/track\/click\?d=/,
            );
            // Verify links are properly rendered as <a> tags
            expect(htmlContent).toMatch(
                /<a[^>]*href=["']https:\/\/test\.com\/api\/track\/click\?d=/,
            );

            await SequenceModel.deleteOne({
                sequenceId: "sequence-links",
            });
            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
            await EmailDelivery.deleteMany({});
        });

        it("should not rewrite mailto, tel, anchor, and API links", async () => {
            // Create a sequence with various link types that should NOT be rewritten
            await (SequenceModel.create as any)({
                domain: testDomain._id,
                sequenceId: "sequence-special-links",
                creatorId: TEST_CREATOR_ID,
                type: "sequence",
                emails: [
                    {
                        emailId: "email-special-links",
                        subject: "Email with Special Links",
                        published: true,
                        delayInMillis: 86400000,
                        content: {
                            content: [
                                {
                                    id: "block-1",
                                    blockType: "link",
                                    settings: {
                                        url: "mailto:test@example.com",
                                        text: "Email",
                                    },
                                },
                                {
                                    id: "block-2",
                                    blockType: "link",
                                    settings: {
                                        url: "tel:+1234567890",
                                        text: "Phone",
                                    },
                                },
                                {
                                    id: "block-3",
                                    blockType: "link",
                                    settings: {
                                        url: "#section",
                                        text: "Anchor",
                                    },
                                },
                                {
                                    id: "block-4",
                                    blockType: "link",
                                    settings: {
                                        url: "/api/track/something",
                                        text: "Track",
                                    },
                                },
                                {
                                    id: "block-5",
                                    blockType: "link",
                                    settings: {
                                        url: "/api/unsubscribe/token",
                                        text: "Unsubscribe",
                                    },
                                },
                            ],
                            style: {
                                colors: {
                                    background: "#ffffff",
                                    foreground: "#000000",
                                    border: "#e2e8f0",
                                    accent: "#0284c7",
                                    accentForeground: "#ffffff",
                                },
                                typography: {
                                    header: {
                                        fontFamily: "Arial, sans-serif",
                                    },
                                    text: {
                                        fontFamily: "Arial, sans-serif",
                                    },
                                    link: {
                                        fontFamily: "Arial, sans-serif",
                                    },
                                },
                                interactives: {
                                    button: {},
                                    link: {},
                                },
                                structure: {
                                    page: {
                                        marginY: "20px",
                                    },
                                    section: {
                                        padding: {
                                            x: "24px",
                                            y: "16px",
                                        },
                                    },
                                },
                            },
                            meta: {},
                        },
                    },
                ],
                emailsOrder: ["email-special-links"],
                report: {
                    sequence: {
                        failed: [],
                    },
                },
            });

            const ongoingSeq = await OngoingSequenceModel.create({
                domain: testDomain._id,
                sequenceId: "sequence-special-links",
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: [],
            });

            // Get fresh references
            const freshDomain = await (DomainModel.findById as any)(
                testDomain._id,
            );
            const freshSequence = await (SequenceModel.findOne as any)({
                sequenceId: "sequence-special-links",
            });
            const freshUser = await (UserModel.findOne as any)({
                userId: TEST_USER_ID,
            });
            const freshCreator = await (UserModel.findOne as any)({
                userId: TEST_CREATOR_ID,
            });

            if (!freshDomain || !freshSequence || !freshUser || !freshCreator) {
                throw new Error("Failed to get fresh references");
            }

            jest.spyOn(queries, "getDomain").mockResolvedValue(freshDomain);
            jest.spyOn(queries, "getSequence").mockResolvedValue(
                freshSequence as any,
            );
            jest.spyOn(queries, "getUser")
                .mockResolvedValueOnce(freshUser as any)
                .mockResolvedValueOnce(freshCreator as any);

            await processOngoingSequence(ongoingSeq._id as any);

            // Verify email was sent
            expect(mockedSendMail).toHaveBeenCalled();
            const sendMailCall = mockedSendMail.mock.calls[0][0];
            const htmlContent = sendMailCall.html;

            // Verify renderEmailToHtml produced valid HTML (not an error)
            expect(htmlContent).not.toContain("<h1>Error:");
            expect(htmlContent).toContain("<!DOCTYPE html>");
            expect(htmlContent).toContain("<html");

            // Verify special links were NOT rewritten in the actual HTML
            // They should remain as-is without tracking URLs
            expect(htmlContent).toContain('href="mailto:test@example.com"');
            expect(htmlContent).toContain('href="tel:+1234567890"');
            expect(htmlContent).toContain('href="#section"');
            expect(htmlContent).toContain('href="/api/track/something"');
            expect(htmlContent).toContain('href="/api/unsubscribe/token"');

            // These should NOT contain the tracking URL
            expect(htmlContent).not.toMatch(
                /mailto:test@example.com.*\/api\/track\/click/,
            );
            expect(htmlContent).not.toMatch(
                /tel:\+1234567890.*\/api\/track\/click/,
            );
            // Verify they don't have tracking tokens
            expect(htmlContent).not.toMatch(/mailto:test@example.com.*\?d=/);
            expect(htmlContent).not.toMatch(/tel:\+1234567890.*\?d=/);

            await SequenceModel.deleteOne({
                sequenceId: "sequence-special-links",
            });
            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
            await EmailDelivery.deleteMany({});
        });

        it("should include tracking pixel in rendered email", async () => {
            // Spy on renderEmailToHtml before calling processOngoingSequence
            const emailEditorModule = await import("@courselit/email-editor");
            const renderEmailToHtmlSpy = jest.spyOn(
                emailEditorModule,
                "renderEmailToHtml",
            );

            const ongoingSeq = await OngoingSequenceModel.create({
                domain: testDomain._id,
                sequenceId: TEST_SEQUENCE_ID,
                userId: TEST_USER_ID,
                nextEmailScheduledTime: Date.now() - 1000,
                retryCount: 0,
                sentEmailIds: [],
            });

            // Get fresh references
            const freshDomain = await (DomainModel.findById as any)(
                testDomain._id,
            );
            const freshSequence = await (SequenceModel.findOne as any)({
                sequenceId: TEST_SEQUENCE_ID,
            });
            const freshUser = await (UserModel.findOne as any)({
                userId: TEST_USER_ID,
            });
            const freshCreator = await (UserModel.findOne as any)({
                userId: TEST_CREATOR_ID,
            });

            if (!freshDomain || !freshSequence || !freshUser || !freshCreator) {
                throw new Error("Failed to get fresh references");
            }

            jest.spyOn(queries, "getDomain").mockResolvedValue(freshDomain);
            jest.spyOn(queries, "getSequence").mockResolvedValue(
                freshSequence as any,
            );
            jest.spyOn(queries, "getUser")
                .mockResolvedValueOnce(freshUser as any)
                .mockResolvedValueOnce(freshCreator as any);

            await processOngoingSequence(ongoingSeq._id as any);

            // Verify email was sent
            expect(mockedSendMail).toHaveBeenCalled();
            const sendMailCall = mockedSendMail.mock.calls[0][0];
            const htmlContent = sendMailCall.html;

            // Verify renderEmailToHtml produced valid HTML (not an error)
            expect(htmlContent).not.toContain("<h1>Error:");
            expect(htmlContent).toContain("<!DOCTYPE html>");
            expect(htmlContent).toContain("<html");

            // Verify renderEmailToHtml was called with email content that includes a pixel
            expect(renderEmailToHtmlSpy).toHaveBeenCalled();
            const renderCall = renderEmailToHtmlSpy.mock.calls[0][0];
            const emailContent = renderCall.email;
            const hasPixelBlock = emailContent.content.some(
                (block: any) =>
                    block.blockType === "image" &&
                    block.settings?.alt === "CourseLit Pixel",
            );
            expect(hasPixelBlock).toBe(true);

            // Verify tracking pixel is included in the actual rendered HTML as an <img> tag
            expect(htmlContent).toContain("/api/track/open?d=");
            expect(htmlContent).toContain('alt="CourseLit Pixel"');
            expect(htmlContent).toContain('height="1px"');
            expect(htmlContent).toContain('width="1px"');
            // Verify it's rendered as an <img> tag
            expect(htmlContent).toMatch(
                /<img[^>]*alt=["']CourseLit Pixel["'][^>]*>/,
            );
            expect(htmlContent).toMatch(
                /<img[^>]*src=["'][^"']*\/api\/track\/open\?d=/,
            );
            expect(htmlContent).toMatch(/width=["']1px["']/i);
            expect(htmlContent).toMatch(/height=["']1px["']/i);
            expect(htmlContent).toMatch(/alt=["']CourseLit Pixel["']/i);
            // Verify it's an img tag
            expect(htmlContent).toMatch(/<img[^>]*\/api\/track\/open/);

            renderEmailToHtmlSpy.mockRestore();

            await OngoingSequenceModel.deleteOne({ _id: ongoingSeq._id });
            await EmailDelivery.deleteMany({});
        });
    });

    describe("getNextPublishedEmail", () => {
        it("should return the first published email in order", () => {
            const sequence: AdminSequence = {
                sequenceId: "test-sequence",
                creatorId: TEST_CREATOR_ID,
                type: "sequence",
                emailsOrder: ["email-1", "email-2"],
                emails: [
                    {
                        emailId: "email-1",
                        subject: "First",
                        published: true,
                        delayInMillis: 86400000,
                        content: {
                            content: [],
                            style: {
                                structure: {},
                                typography: {},
                                colors: {},
                            },
                            meta: {},
                        },
                    },
                    {
                        emailId: "email-2",
                        subject: "Second",
                        published: true,
                        delayInMillis: 86400000,
                        content: {
                            content: [],
                            style: {
                                structure: {},
                                typography: {},
                                colors: {},
                            },
                            meta: {},
                        },
                    },
                ],
                report: {
                    sequence: {
                        failed: [],
                    },
                },
            } as any;

            const ongoingSequence = {
                sentEmailIds: [],
            } as any;

            const result = getNextPublishedEmail(sequence, ongoingSequence);

            expect(result).toBeTruthy();
            expect(result?.emailId).toBe("email-1");
        });

        it("should skip already sent emails", () => {
            const sequence: AdminSequence = {
                sequenceId: "test-sequence",
                creatorId: TEST_CREATOR_ID,
                type: "sequence",
                emailsOrder: ["email-1", "email-2"],
                emails: [
                    {
                        emailId: "email-1",
                        subject: "First",
                        published: true,
                        delayInMillis: 86400000,
                        content: {
                            content: [],
                            style: {
                                structure: {},
                                typography: {},
                                colors: {},
                            },
                            meta: {},
                        },
                    },
                    {
                        emailId: "email-2",
                        subject: "Second",
                        published: true,
                        delayInMillis: 86400000,
                        content: {
                            content: [],
                            style: {
                                structure: {},
                                typography: {},
                                colors: {},
                            },
                            meta: {},
                        },
                    },
                ],
                report: {
                    sequence: {
                        failed: [],
                    },
                },
            } as any;

            const ongoingSequence = {
                sentEmailIds: ["email-1"],
            } as any;

            const result = getNextPublishedEmail(sequence, ongoingSequence);

            expect(result).toBeTruthy();
            expect(result?.emailId).toBe("email-2");
        });

        it("should skip unpublished emails", () => {
            const sequence: AdminSequence = {
                sequenceId: "test-sequence",
                creatorId: TEST_CREATOR_ID,
                type: "sequence",
                emailsOrder: ["email-1", "email-2"],
                emails: [
                    {
                        emailId: "email-1",
                        subject: "First",
                        published: false, // Not published
                        delayInMillis: 86400000,
                        content: {
                            content: [],
                            style: {
                                structure: {},
                                typography: {},
                                colors: {},
                            },
                            meta: {},
                        },
                    },
                    {
                        emailId: "email-2",
                        subject: "Second",
                        published: true,
                        delayInMillis: 86400000,
                        content: {
                            content: [],
                            style: {
                                structure: {},
                                typography: {},
                                colors: {},
                            },
                            meta: {},
                        },
                    },
                ],
                report: {
                    sequence: {
                        failed: [],
                    },
                },
            } as any;

            const ongoingSequence = {
                sentEmailIds: [],
            } as any;

            const result = getNextPublishedEmail(sequence, ongoingSequence);

            expect(result).toBeTruthy();
            expect(result?.emailId).toBe("email-2");
        });

        it("should return null when all emails are sent", () => {
            const sequence: AdminSequence = {
                sequenceId: "test-sequence",
                creatorId: TEST_CREATOR_ID,
                type: "sequence",
                emailsOrder: ["email-1", "email-2"],
                emails: [
                    {
                        emailId: "email-1",
                        subject: "First",
                        published: true,
                        delayInMillis: 86400000,
                        content: {
                            content: [],
                            style: {
                                structure: {},
                                typography: {},
                                colors: {},
                            },
                            meta: {},
                        },
                    },
                    {
                        emailId: "email-2",
                        subject: "Second",
                        published: true,
                        delayInMillis: 86400000,
                        content: {
                            content: [],
                            style: {
                                structure: {},
                                typography: {},
                                colors: {},
                            },
                            meta: {},
                        },
                    },
                ],
                report: {
                    sequence: {
                        failed: [],
                    },
                },
            } as any;

            const ongoingSequence = {
                sentEmailIds: ["email-1", "email-2"],
            } as any;

            const result = getNextPublishedEmail(sequence, ongoingSequence);

            expect(result).toBeNull();
        });

        it("should return null when no published emails exist", () => {
            const sequence: AdminSequence = {
                sequenceId: "test-sequence",
                creatorId: TEST_CREATOR_ID,
                type: "sequence",
                emailsOrder: ["email-1", "email-2"],
                emails: [
                    {
                        emailId: "email-1",
                        subject: "First",
                        published: false,
                        delayInMillis: 86400000,
                        content: {
                            content: [],
                            style: {
                                structure: {},
                                typography: {},
                                colors: {},
                            },
                            meta: {},
                        },
                    },
                    {
                        emailId: "email-2",
                        subject: "Second",
                        published: false,
                        delayInMillis: 86400000,
                        content: {
                            content: [],
                            style: {
                                structure: {},
                                typography: {},
                                colors: {},
                            },
                            meta: {},
                        },
                    },
                ],
                report: {
                    sequence: {
                        failed: [],
                    },
                },
            } as any;

            const ongoingSequence = {
                sentEmailIds: [],
            } as any;

            const result = getNextPublishedEmail(sequence, ongoingSequence);

            expect(result).toBeNull();
        });
    });
});
