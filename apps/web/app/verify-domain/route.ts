import DomainModel, { Domain } from "@courselit/orm-models/dao/domain";
import { responses } from "../../config/strings";
import constants from "@/config/constants";
import { isDateInFuture } from "../../lib/utils";
import { createUser } from "../../graphql/users/logic";
import { headers } from "next/headers";
import connectToDatabase from "../../services/db";
import { warn } from "@/services/logger";
import SubscriberModel, {
    Subscriber,
} from "@courselit/orm-models/dao/subscriber";
import { Constants } from "@courselit/common-models";

const { domainNameForSingleTenancy, schoolNameForSingleTenancy } = constants;

const getDomainBasedOnSubdomain = async (
    subdomain: string,
): Promise<Domain | null> => {
    return await DomainModel.queryOne({ name: subdomain, deleted: false });
};

const getDomainBasedOnCustomDomain = async (
    customDomain: string,
): Promise<Domain | null> => {
    return await DomainModel.queryOne({ customDomain, deleted: false });
};

const getDomain = async (hostName: string): Promise<Domain | null> => {
    const isProduction = process.env.NODE_ENV === "production";
    const isSubdomain = hostName.endsWith(`.${process.env.DOMAIN}`);

    if (isProduction && (hostName === process.env.DOMAIN || !isSubdomain)) {
        return getDomainBasedOnCustomDomain(hostName);
    }

    const [subdomain] = hostName?.split(".");
    return getDomainBasedOnSubdomain(subdomain);
};

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const headerList = await headers();
    let domain: Domain | null;

    await connectToDatabase();

    if (constants.multitenant) {
        const host = headerList.get("host");

        if (!host) {
            return Response.json(
                {
                    message: responses.domain_missing,
                },
                {
                    status: 404,
                },
            );
        }

        domain = await getDomain(host);

        if (!domain) {
            return Response.json(
                {
                    message: `${responses.domain_doesnt_exist}: ${
                        host?.split(".")[0]
                    }`,
                },
                { status: 404 },
            );
        }

        if (
            !domain.checkSubscriptionStatusAfter ||
            (domain.checkSubscriptionStatusAfter &&
                !isDateInFuture(domain.checkSubscriptionStatusAfter))
        ) {
            try {
                if (!process.env.SUBSCRIPTION_APP_ENDPOINT) {
                    throw new Error("Subscription app endpoint is missing");
                }

                const response = await fetch(
                    `${process.env.SUBSCRIPTION_APP_ENDPOINT}/school/verify?domain=${domain.name}`,
                );
                if (response.ok) {
                    const data = await response.json();
                    if (!data) {
                        return Response.json(
                            {
                                message: responses.not_valid_subscription,
                            },
                            { status: 404 },
                        );
                    }
                } else {
                    return Response.json(
                        { message: responses.not_valid_subscription },
                        { status: 404 },
                    );
                }
            } catch (err: any) {
                return Response.json(
                    { message: responses.not_valid_subscription },
                    { status: 404 },
                );
            }

            const currentDate = new Date();
            const dateAfter24Hours = new Date(currentDate.getTime() + 86400000);
            await DomainModel.patchOneAndGet(
                { _id: domain!._id },
                { $set: { checkSubscriptionStatusAfter: dateAfter24Hours } },
                { upsert: false },
            );
        }
    } else {
        domain = await DomainModel.queryOne({
            name: domainNameForSingleTenancy,
        });

        if (!domain) {
            if (!process.env.SUPER_ADMIN_EMAIL) {
                console.error(responses.domain_super_admin_email_missing);
                process.exit(1);
            }

            domain = await DomainModel.patchOneAndGet(
                {
                    name: domainNameForSingleTenancy,
                },
                {
                    email: process.env.SUPER_ADMIN_EMAIL,
                    firstRun: true,
                    quota: {
                        mail: {
                            daily: 1000000,
                            monthly: 100000000,
                            dailyCount: 0,
                            monthlyCount: 0,
                            lastDailyCountUpdate: new Date(),
                            lastMonthlyCountUpdate: new Date(),
                        },
                    },
                    settings: {
                        title: schoolNameForSingleTenancy,
                        logins: [Constants.LoginProvider.EMAIL],
                    },
                    features: [
                        Constants.Features.SSO,
                        Constants.Features.API,
                        Constants.Features.LOG,
                    ],
                },
                {
                    upsert: true,
                    new: true,
                },
            );
        }
    }

    if (domain!.firstRun) {
        try {
            await createUser({
                domain: domain!,
                email: domain!.email,
                superAdmin: true,
                name: constants.multitenant
                    ? await getSubscriberName(domain!.email)
                    : "",
            });
            await DomainModel.patchOneAndGet(
                { _id: domain!._id },
                { $set: { firstRun: false } },
                { upsert: false },
            );
        } catch (err) {
            warn(`Error in creating user: ${err.message}`, {
                domain: domain?.name,
                route: "verify-domain",
                stack: err.stack,
            });
        }
    }

    const payload = {
        success: true,
        domain: domain!.name,
        domainId: domain!._id.toString(),
        logo: domain!.settings?.logo?.file,
        domainEmail: domain!.email,
        domainTitle: domain!.settings?.title,
        hideCourseLitBranding: domain!.settings?.hideCourseLitBranding,
        ssoTrustedDomain: domain!.settings?.ssoTrustedDomain,
    };

    return Response.json(payload);
}

async function getSubscriberName(email: string): Promise<string | undefined> {
    const subscriber = (await SubscriberModel.queryOne(
        { email },
        { name: 1, _id: 0 },
    )) as unknown as Subscriber;

    return subscriber ? subscriber.name : "";
}
