/**
 * @jest-environment node
 */

import { getCertificate } from "../logic";
import CertificateModel from "@models/Certificate";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import CertificateTemplateModel from "@models/CertificateTemplate";
import { responses } from "@/config/strings";
import Domain from "@models/Domain";
import PageModel from "@models/Page";
import MembershipModel from "@models/Membership";
import CommunityModel from "@models/Community";

describe("Certificate generation", () => {
    let mockCtx: any;
    let mockDomain: any;
    let testDomain: any;

    beforeAll(async () => {
        // Create a test domain
        testDomain = await Domain.create({
            name: "Test Domain",
            email: "test@example.com",
            settings: {
                logo: {
                    mediaId: "logo-123",
                    file: "logo.png",
                    originalFileName: "logo.png",
                    mimeType: "image/png",
                    size: 1024,
                    access: "public",
                },
            },
        });
    });

    beforeEach(() => {
        mockDomain = testDomain;

        mockCtx = {
            subdomain: mockDomain as any,
            user: {
                userId: "test-user",
                name: "Test User",
                email: "test@example.com",
                permissions: [],
            } as any,
            address: "https://test.com",
        } as any;
    });

    afterEach(async () => {
        // Clean up collections after each test
        await CertificateModel.deleteMany({});
        await UserModel.deleteMany({});
        await CourseModel.deleteMany({});
        await PageModel.deleteMany({});
        await MembershipModel.deleteMany({});
        await CommunityModel.deleteMany({});
        await CertificateTemplateModel.deleteMany({});
    });

    it("should throw error when certificateId is 'demo' but courseId is not provided", async () => {
        await expect(getCertificate("demo", mockCtx)).rejects.toThrow(
            responses.certificate_demo_course_id_required,
        );
    });

    it("should generate demo certificate when courseId is provided", async () => {
        // Create a test course
        const testCourse = await CourseModel.create({
            courseId: "course-123",
            title: "Test Course",
            creatorId: "creator-123",
            pageId: "page-123",
            domain: testDomain._id,
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: "test-course",
        });

        const result = await getCertificate("demo", mockCtx, "course-123");

        expect(result).toEqual({
            certificateId: "demo",
            title: "Certificate of Completion",
            subtitle: "This certificate is awarded to",
            description: "for completing the course.",
            signatureImage: null,
            signatureName: undefined,
            signatureDesignation: null,
            logo: mockDomain.settings.logo,
            productTitle: "Test Course",
            userName: "John Doe",
            createdAt: expect.any(Date),
            userImage: null,
            productPageId: "page-123",
        });
    });

    it("should generate certificate with complete data", async () => {
        // Create test data
        const testUser = await UserModel.create({
            userId: "user-123",
            name: "John Doe",
            email: "john@example.com",
            avatar: {
                mediaId: "avatar-123",
                file: "avatar.jpg",
                originalFileName: "avatar.jpg",
                mimeType: "image/jpeg",
                size: 2048,
                access: "public",
            },
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-123",
        });

        const testCreator = await UserModel.create({
            userId: "creator-123",
            name: "Jane Smith",
            email: "jane@example.com",
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-creator",
        });

        const testCourse = await CourseModel.create({
            courseId: "course-123",
            title: "Advanced Course",
            creatorId: "creator-123",
            pageId: "page-123",
            domain: testDomain._id,
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: "advanced-course",
        });

        const testTemplate = await CertificateTemplateModel.create({
            templateId: "template-123",
            title: "Custom Certificate Title",
            subtitle: "Custom subtitle",
            description: "Custom description",
            signatureImage: {
                mediaId: "signature-123",
                file: "signature.png",
                originalFileName: "signature.png",
                mimeType: "image/png",
                size: 1024,
                access: "public",
            },
            signatureName: "Jane Smith",
            signatureDesignation: "Course Instructor",
            logo: {
                mediaId: "template-logo-123",
                file: "template-logo.png",
                originalFileName: "template-logo.png",
                mimeType: "image/png",
                size: 1024,
                access: "public",
            },
            courseId: "course-123",
            domain: testDomain._id,
        });

        const testCertificate = await CertificateModel.create({
            certificateId: "cert-123",
            userId: "user-123",
            courseId: "course-123",
            createdAt: new Date("2024-01-01"),
            domain: testDomain._id,
        });

        const result = await getCertificate("cert-123", mockCtx);

        expect(result.certificateId).toBe("cert-123");
        expect(result.title).toBe("Custom Certificate Title");
        expect(result.subtitle).toBe("Custom subtitle");
        expect(result.description).toBe("Custom description");
        expect(result.signatureImage).toBeDefined();
        expect(result.signatureImage.file).toBe("signature.png");
        expect(result.signatureName).toBe("Jane Smith");
        expect(result.signatureDesignation).toBe("Course Instructor");
        expect(result.logo).toBeDefined();
        expect(result.logo!.file).toBe("template-logo.png");
        expect(result.productTitle).toBe("Advanced Course");
        expect(result.userName).toBe("John Doe");
        expect(result.createdAt).toEqual(new Date("2024-01-01"));
        expect(result.userImage).toBeDefined();
        expect(result.userImage!.file).toBe("avatar.jpg");
        expect(result.productPageId).toBe("page-123");
    });

    it("should throw error when certificate is not found", async () => {
        await expect(
            getCertificate("nonexistent-cert", mockCtx),
        ).rejects.toThrow(responses.item_not_found);
    });

    it("should throw error when course is not found", async () => {
        // Create a certificate but no corresponding course
        const testUser = await UserModel.create({
            userId: "user-123",
            name: "John Doe",
            email: "john@example.com",
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-user",
        });

        const testCertificate = await CertificateModel.create({
            certificateId: "cert-123",
            userId: "user-123",
            courseId: "nonexistent-course",
            createdAt: new Date("2024-01-01"),
            domain: testDomain._id,
        });

        await expect(getCertificate("cert-123", mockCtx)).rejects.toThrow(
            responses.item_not_found,
        );
    });

    it("should use fallback values when template is missing", async () => {
        // Create test data without template
        const testUser = await UserModel.create({
            userId: "user-123",
            name: "John Doe",
            email: "john@example.com",
            avatar: null,
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-user",
        });

        const testCreator = await UserModel.create({
            userId: "creator-123",
            name: "Jane Smith",
            email: "jane@example.com",
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-creator",
        });

        const testCourse = await CourseModel.create({
            courseId: "course-123",
            title: "Test Course",
            creatorId: "creator-123",
            pageId: "page-123",
            domain: testDomain._id,
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: "test-course-2",
        });

        const testCertificate = await CertificateModel.create({
            certificateId: "cert-123",
            userId: "user-123",
            courseId: "course-123",
            createdAt: new Date("2024-01-01"),
            domain: testDomain._id,
        });

        const result = await getCertificate("cert-123", mockCtx);

        expect(result).toEqual({
            certificateId: "cert-123",
            title: "Certificate of Completion",
            subtitle: "This certificate is awarded to",
            description: "for completing the course.",
            signatureImage: null,
            signatureName: "Jane Smith",
            signatureDesignation: null,
            logo: mockDomain.settings.logo,
            productTitle: "Test Course",
            userName: "John Doe",
            createdAt: new Date("2024-01-01"),
            userImage: null,
            productPageId: "page-123",
        });
    });

    it("should use fallback values when template has partial data", async () => {
        // Create test data with partial template
        const testUser = await UserModel.create({
            userId: "user-123",
            name: "John Doe",
            email: "john@example.com",
            avatar: null,
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-user",
        });

        const testCreator = await UserModel.create({
            userId: "creator-123",
            name: "Jane Smith",
            email: "jane@example.com",
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-creator",
        });

        const testCourse = await CourseModel.create({
            courseId: "course-123",
            title: "Test Course",
            creatorId: "creator-123",
            pageId: "page-123",
            domain: testDomain._id,
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: "test-course-2",
        });

        const testTemplate = await CertificateTemplateModel.create({
            templateId: "template-partial-123",
            title: "Custom Title",
            subtitle: "Custom subtitle",
            description: "Custom description",
            // Missing signatureImage, signatureDesignation, logo
            signatureName: "Custom Signature",
            courseId: "course-123",
            domain: testDomain._id,
        });

        const testCertificate = await CertificateModel.create({
            certificateId: "cert-123",
            userId: "user-123",
            courseId: "course-123",
            createdAt: new Date("2024-01-01"),
            domain: testDomain._id,
        });

        const result = await getCertificate("cert-123", mockCtx);

        expect(result.certificateId).toBe("cert-123");
        expect(result.title).toBe("Custom Title");
        expect(result.subtitle).toBe("Custom subtitle");
        expect(result.description).toBe("Custom description");
        expect(result.signatureImage).toBe(null);
        expect(result.signatureName).toBe("Custom Signature");
        expect(result.signatureDesignation).toBe(null);
        expect(result.logo).toBeDefined();
        if (result.logo === null) {
            throw new Error("Expected logo to be defined");
        }
        expect(result.logo.file).toBe("logo.png");
        expect(result.productTitle).toBe("Test Course");
        expect(result.userName).toBe("John Doe");
        expect(result.createdAt).toEqual(new Date("2024-01-01"));
        expect(result.userImage).toBe(null);
        expect(result.productPageId).toBe("page-123");
    });

    it("should use user email as fallback when user name is missing", async () => {
        // Create test data with user having no name
        const testUser = await UserModel.create({
            userId: "user-123",
            name: null,
            email: "john@example.com",
            avatar: null,
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-user",
        });

        const testCreator = await UserModel.create({
            userId: "creator-123",
            name: "Jane Smith",
            email: "jane@example.com",
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-creator",
        });

        const testCourse = await CourseModel.create({
            courseId: "course-123",
            title: "Test Course",
            creatorId: "creator-123",
            pageId: "page-123",
            domain: testDomain._id,
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: "test-course-2",
        });

        const testCertificate = await CertificateModel.create({
            certificateId: "cert-123",
            userId: "user-123",
            courseId: "course-123",
            createdAt: new Date("2024-01-01"),
            domain: testDomain._id,
        });

        const result = await getCertificate("cert-123", mockCtx);

        expect(result.userName).toBe("john@example.com");
    });

    it("should use creator name as fallback when template signatureName is missing", async () => {
        // Create test data with template missing signatureName
        const testUser = await UserModel.create({
            userId: "user-123",
            name: "John Doe",
            email: "john@example.com",
            avatar: null,
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-user",
        });

        const testCreator = await UserModel.create({
            userId: "creator-123",
            name: "Jane Smith",
            email: "jane@example.com",
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-creator",
        });

        const testCourse = await CourseModel.create({
            courseId: "course-123",
            title: "Test Course",
            creatorId: "creator-123",
            pageId: "page-123",
            domain: testDomain._id,
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: "test-course-2",
        });

        const testTemplate = await CertificateTemplateModel.create({
            templateId: "template-no-signature-123",
            title: "Custom Title",
            subtitle: "Custom subtitle",
            description: "Custom description",
            signatureName: "Template Signature", // Valid signatureName
            courseId: "course-123",
            domain: testDomain._id,
        });

        const testCertificate = await CertificateModel.create({
            certificateId: "cert-123",
            userId: "user-123",
            courseId: "course-123",
            createdAt: new Date("2024-01-01"),
            domain: testDomain._id,
        });

        const result = await getCertificate("cert-123", mockCtx);

        expect(result.signatureName).toBe("Template Signature");
    });

    it("should use domain logo as fallback when template logo is missing", async () => {
        // Create test data with template missing logo
        const testUser = await UserModel.create({
            userId: "user-123",
            name: "John Doe",
            email: "john@example.com",
            avatar: null,
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-user",
        });

        const testCreator = await UserModel.create({
            userId: "creator-123",
            name: "Jane Smith",
            email: "jane@example.com",
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-creator",
        });

        const testCourse = await CourseModel.create({
            courseId: "course-123",
            title: "Test Course",
            creatorId: "creator-123",
            pageId: "page-123",
            domain: testDomain._id,
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: "test-course-2",
        });

        const testTemplate = await CertificateTemplateModel.create({
            templateId: "template-no-logo-123",
            title: "Custom Title",
            subtitle: "Custom subtitle",
            description: "Custom description",
            signatureName: "Custom Signature",
            // Missing logo
            courseId: "course-123",
            domain: testDomain._id,
        });

        const testCertificate = await CertificateModel.create({
            certificateId: "cert-123",
            userId: "user-123",
            courseId: "course-123",
            createdAt: new Date("2024-01-01"),
            domain: testDomain._id,
        });

        const result = await getCertificate("cert-123", mockCtx);

        expect(result.logo).toBe(mockDomain.settings.logo);
    });

    it("should use null as fallback when domain logo is missing", async () => {
        // Create a domain without logo settings
        const testDomainWithoutLogo = await Domain.create({
            name: "Test Domain Without Logo",
            email: "test@example.com",
            settings: {},
        });

        const mockCtxWithoutLogo = {
            subdomain: testDomainWithoutLogo as any,
            user: {
                userId: "test-user",
                name: "Test User",
                email: "test@example.com",
                permissions: [],
            } as any,
            address: "https://test.com",
        } as any;

        // Create test data
        const testUser = await UserModel.create({
            userId: "user-123",
            name: "John Doe",
            email: "john@example.com",
            avatar: null,
            domain: testDomainWithoutLogo._id,
            unsubscribeToken: "unsubscribe-token-user",
        });

        const testCreator = await UserModel.create({
            userId: "creator-123",
            name: "Jane Smith",
            email: "jane@example.com",
            domain: testDomainWithoutLogo._id,
            unsubscribeToken: "unsubscribe-token-creator",
        });

        const testCourse = await CourseModel.create({
            courseId: "course-123",
            title: "Test Course",
            creatorId: "creator-123",
            pageId: "page-123",
            domain: testDomainWithoutLogo._id,
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: "test-course-no-logo",
        });

        const testTemplate = await CertificateTemplateModel.create({
            templateId: "template-no-logo-domain-123",
            title: "Custom Title",
            subtitle: "Custom subtitle",
            description: "Custom description",
            signatureName: "Custom Signature",
            // Missing logo
            courseId: "course-123",
            domain: testDomainWithoutLogo._id,
        });

        const testCertificate = await CertificateModel.create({
            certificateId: "cert-123",
            userId: "user-123",
            courseId: "course-123",
            createdAt: new Date("2024-01-01"),
            domain: testDomainWithoutLogo._id,
        });

        const result = await getCertificate("cert-123", mockCtxWithoutLogo);

        expect(result.logo).toBe(null);
    });

    it("should handle missing creator gracefully", async () => {
        // Create test data with missing creator
        const testUser = await UserModel.create({
            userId: "user-123",
            name: "John Doe",
            email: "john@example.com",
            avatar: null,
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-user",
        });

        const testCourse = await CourseModel.create({
            courseId: "course-123",
            title: "Test Course",
            creatorId: "nonexistent-creator",
            pageId: "page-123",
            domain: testDomain._id,
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: "test-course-edge-1",
        });

        const testCertificate = await CertificateModel.create({
            certificateId: "cert-123",
            userId: "user-123",
            courseId: "course-123",
            createdAt: new Date("2024-01-01"),
            domain: testDomain._id,
        });

        const result = await getCertificate("cert-123", mockCtx);

        expect(result.signatureName).toBe(undefined);
    });

    it("should handle missing course pageId gracefully", async () => {
        // Create test data with course missing pageId
        const testUser = await UserModel.create({
            userId: "user-123",
            name: "John Doe",
            email: "john@example.com",
            avatar: null,
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-user",
        });

        const testCreator = await UserModel.create({
            userId: "creator-123",
            name: "Jane Smith",
            email: "jane@example.com",
            domain: testDomain._id,
            unsubscribeToken: "unsubscribe-token-creator",
        });

        const testCourse = await CourseModel.create({
            courseId: "course-123",
            title: "Test Course",
            creatorId: "creator-123",
            pageId: null, // Missing pageId
            domain: testDomain._id,
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            slug: "test-course-edge-2",
        });

        const testCertificate = await CertificateModel.create({
            certificateId: "cert-123",
            userId: "user-123",
            courseId: "course-123",
            createdAt: new Date("2024-01-01"),
            domain: testDomain._id,
        });

        const result = await getCertificate("cert-123", mockCtx);

        expect(result.productPageId).toBe(null);
    });
});
