import { UIConstants } from "@courselit/common-models";
import constants from "@/config/constants";
import { responses } from "@/config/strings";
import DomainModel from "@/models/Domain";
import UserModel from "@/models/User";
import { resetPaymentMethod } from "../logic";

const SUITE_PREFIX = `payment-settings-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("Payment settings", () => {
    let testDomain: any;
    let adminUser: any;
    let regularUser: any;
    let mockCtx: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
            settings: {
                title: "Test school",
                currencyISOCode: "usd",
                paymentMethod: UIConstants.PAYMENT_METHOD_STRIPE,
            },
        });

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
        await DomainModel.updateOne(
            { _id: testDomain._id },
            {
                $set: {
                    "settings.paymentMethod": UIConstants.PAYMENT_METHOD_STRIPE,
                },
            },
        );
    });

    afterAll(async () => {
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    it("should throw if user is not authenticated", async () => {
        await expect(
            resetPaymentMethod({
                subdomain: testDomain,
            } as any),
        ).rejects.toThrow();
    });

    it("should throw if user does not have manage settings permission", async () => {
        await expect(
            resetPaymentMethod({
                user: regularUser,
                subdomain: testDomain,
            } as any),
        ).rejects.toThrow(responses.action_not_allowed);
    });

    it("should reset payment method to none for admin users", async () => {
        const result = await resetPaymentMethod(mockCtx);

        expect(result?.settings?.paymentMethod).toBe(
            UIConstants.PAYMENT_METHOD_NONE,
        );

        const updatedDomain = await DomainModel.findById(testDomain._id);
        expect(updatedDomain?.settings?.paymentMethod).toBe(
            UIConstants.PAYMENT_METHOD_NONE,
        );
        expect(updatedDomain?.settings?.currencyISOCode).toBe("usd");
    });
});
