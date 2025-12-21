import {
    updateSSOProvider,
    getSSOProviderSettings,
    getSSOProvider,
    removeSSOProvider,
    getFeatures,
    toggleLoginProvider,
} from "../logic";
import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import SSOProviderModel from "@models/SSOProvider";
import constants from "@/config/constants";
import { Constants } from "@courselit/common-models";

const SUITE_PREFIX = `sso-tests-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("SSO Logic Tests", () => {
    let testDomain: any;
    let adminUser: any;
    let regularUser: any;
    let mockCtx: any;

    beforeAll(async () => {
        // Create test domain with SSO feature enabled
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
            features: [Constants.Features.SSO],
            settings: {
                logins: [Constants.LoginProvider.EMAIL],
            },
        });

        // Create admin user with manageSettings permission
        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: id("admin"),
            email: email("admin"),
            name: "Admin User",
            permissions: [constants.permissions.manageSettings],
            active: true,
            unsubscribeToken: id("unsubscribe-admin"),
            purchases: [],
        });

        // Create regular user without permissions
        regularUser = await UserModel.create({
            domain: testDomain._id,
            userId: id("regular"),
            email: email("regular"),
            name: "Regular User",
            permissions: [],
            active: true,
            unsubscribeToken: id("unsubscribe-regular"),
            purchases: [],
        });

        mockCtx = {
            user: adminUser,
            subdomain: testDomain,
        } as any;
    });

    afterEach(async () => {
        await SSOProviderModel.deleteMany({ domain: testDomain._id });
        // Reset domain settings
        await DomainModel.updateOne(
            { _id: testDomain._id },
            {
                $set: {
                    "settings.ssoTrustedDomain": undefined,
                    "settings.logins": [Constants.LoginProvider.EMAIL],
                },
            },
        );
        // Refresh local domain object
        const updatedDomain = await DomainModel.findById(testDomain._id);
        mockCtx.subdomain = updatedDomain;
    });

    afterAll(async () => {
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    describe("updateSSOProvider", () => {
        const validConfig = {
            idpMetadata: "xml-metadata",
            entryPoint: "https://idp.example.com",
            cert: "cert-string",
            backend: "https://backend.example.com",
        };

        it("should throw if user is not authenticated", async () => {
            await expect(
                updateSSOProvider({ ...validConfig, context: {} as any }),
            ).rejects.toThrow();
        });

        it("should throw if user does not have manageSettings permission", async () => {
            const ctx = { ...mockCtx, user: regularUser };
            await expect(
                updateSSOProvider({ ...validConfig, context: ctx }),
            ).rejects.toThrow();
        });

        it("should throw if domain does not have SSO feature", async () => {
            // Temporarily remove SSO feature
            const noSSODomain = { ...mockCtx.subdomain, features: [] };
            const ctx = { ...mockCtx, subdomain: noSSODomain };
            await expect(
                updateSSOProvider({ ...validConfig, context: ctx }),
            ).rejects.toThrow();
        });

        it("should throw if configuration is invalid", async () => {
            await expect(
                updateSSOProvider({
                    ...validConfig,
                    idpMetadata: "",
                    context: mockCtx,
                }),
            ).rejects.toThrow();
        });

        it("should create SSO provider and update domain settings", async () => {
            const result = await updateSSOProvider({
                ...validConfig,
                context: mockCtx,
            });

            expect(result).toBeDefined();
            expect(result.providerId).toBe("sso");

            const savedProvider = await SSOProviderModel.findOne({
                domain: testDomain._id,
            });
            expect(savedProvider).toBeDefined();
            const samlConfig = JSON.parse(savedProvider!.samlConfig);
            expect(samlConfig.entryPoint).toBe(validConfig.entryPoint);

            // Check if domain settings updated (refresh context first or check DB)
            const domain = await DomainModel.findById(testDomain._id);
            expect(domain!.settings.ssoTrustedDomain).toBe(
                new URL(validConfig.entryPoint).origin,
            );
        });
    });

    describe("getSSOProviderSettings", () => {
        it("should return null if no provider exists", async () => {
            const result = await getSSOProviderSettings(mockCtx);
            expect(result).toBeNull();
        });

        it("should return settings if provider exists", async () => {
            // Setup provider
            const config = {
                entryPoint: "https://test-idp.com",
                cert: "test-cert",
                idpMetadata: { metadata: "test-metadata" },
            };

            await SSOProviderModel.create({
                id: id("sso-1"),
                domain: testDomain._id,
                providerId: "sso",
                samlConfig: JSON.stringify(config),
                domain_string: "backend.com",
            });

            const result = await getSSOProviderSettings(mockCtx);
            expect(result).toEqual({
                entryPoint: config.entryPoint,
                cert: config.cert,
                idpMetadata: config.idpMetadata.metadata,
            });
        });
    });

    describe("getSSOProvider", () => {
        it("should return null if feature disabled", async () => {
            const noSSODomain = { ...mockCtx.subdomain, features: [] };
            const ctx = { ...mockCtx, subdomain: noSSODomain };
            const result = await getSSOProvider(ctx);
            expect(result).toBeNull();
        });

        it("should return null if no provider configured", async () => {
            const result = await getSSOProvider(mockCtx);
            expect(result).toBeNull();
        });

        it("should return provider info if configured", async () => {
            await SSOProviderModel.create({
                id: id("sso-2"),
                domain: testDomain._id,
                providerId: "sso",
                samlConfig: "{}",
                domain_string: "test-domain",
            });

            const result = await getSSOProvider(mockCtx);
            expect(result).toEqual({
                providerId: "sso",
                domain: "test-domain",
            });
        });
    });

    describe("removeSSOProvider", () => {
        it("should remove provider and disable SSO login", async () => {
            // Setup
            await SSOProviderModel.create({
                id: id("sso-3"),
                domain: testDomain._id,
                providerId: "sso",
                samlConfig: "{}",
                domain_string: "test",
            });

            // Enable SSO login first
            await toggleLoginProvider({
                provider: Constants.LoginProvider.SSO,
                value: true,
                ctx: mockCtx,
            });

            const result = await removeSSOProvider(mockCtx);
            expect(result).toBe(true);

            // Verify removal
            const provider = await SSOProviderModel.findOne({
                domain: testDomain._id,
            });
            expect(provider).toBeNull();

            // Verify login disabled
            const domain = await DomainModel.findById(testDomain._id);
            expect(domain!.settings.logins).not.toContain(
                Constants.LoginProvider.SSO,
            );
            expect(domain!.settings.ssoTrustedDomain).toBeUndefined();
        });
    });

    describe("toggleLoginProvider", () => {
        it("should enable SSO login if provider configured", async () => {
            // Must have provider first
            await SSOProviderModel.create({
                id: id("sso-4"),
                domain: testDomain._id,
                providerId: "sso",
                samlConfig: "{}",
                domain_string: "test",
            });

            const result = await toggleLoginProvider({
                provider: Constants.LoginProvider.SSO,
                value: true,
                ctx: mockCtx,
            });

            expect(result).toContain(Constants.LoginProvider.SSO);
        });

        it("should throw if enabling SSO without provider", async () => {
            await expect(
                toggleLoginProvider({
                    provider: Constants.LoginProvider.SSO,
                    value: true,
                    ctx: mockCtx,
                }),
            ).rejects.toThrow();
        });

        it("should toggle email login", async () => {
            // Ensure we have another provider so we can disable email (though logic.ts might allow disabling if it's not the ONLY one, or logic prevents disabling the last one)
            // logic.ts: if !value and logins.length <= 1 and contains EMAIL -> throw.
            // So we cannot disable email if it is the only one.

            await expect(
                toggleLoginProvider({
                    provider: Constants.LoginProvider.EMAIL,
                    value: false,
                    ctx: mockCtx,
                }),
            ).rejects.toThrow();

            // Add SSO then disable email
            await SSOProviderModel.create({
                id: id("sso-5"),
                domain: testDomain._id,
                providerId: "sso",
                samlConfig: "{}",
                domain_string: "test",
            });
            await toggleLoginProvider({
                provider: Constants.LoginProvider.SSO,
                value: true,
                ctx: mockCtx,
            });

            // Now disable email
            const result = await toggleLoginProvider({
                provider: Constants.LoginProvider.EMAIL,
                value: false,
                ctx: mockCtx,
            });
            expect(result).not.toContain(Constants.LoginProvider.EMAIL);
        });

        it("should automatically re-enable email if SSO is disabled and it was the only provider", async () => {
            // Setup: Create provider and enable SSO
            await SSOProviderModel.create({
                id: id("sso-auto-enable"),
                domain: testDomain._id,
                providerId: "sso",
                samlConfig: "{}",
                domain_string: "test",
            });

            await toggleLoginProvider({
                provider: Constants.LoginProvider.SSO,
                value: true,
                ctx: mockCtx,
            });

            // Disable Email (allowed because SSO is enabled)
            await toggleLoginProvider({
                provider: Constants.LoginProvider.EMAIL,
                value: false,
                ctx: mockCtx,
            });

            expect(mockCtx.subdomain.settings.logins).not.toContain(
                Constants.LoginProvider.EMAIL,
            );
            expect(mockCtx.subdomain.settings.logins).toContain(
                Constants.LoginProvider.SSO,
            );

            // Disable SSO - should fallback to Email
            const result = await toggleLoginProvider({
                provider: Constants.LoginProvider.SSO,
                value: false,
                ctx: mockCtx,
            });

            expect(result).toContain(Constants.LoginProvider.EMAIL);
            expect(mockCtx.subdomain.settings.logins).toContain(
                Constants.LoginProvider.EMAIL,
            );
        });
    });

    describe("getFeatures", () => {
        it("should return domain features", async () => {
            const features = await getFeatures(mockCtx);
            expect(features).toContain(Constants.Features.SSO);
        });
    });
});
