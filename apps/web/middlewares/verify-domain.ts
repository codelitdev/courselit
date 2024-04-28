import DomainModel, { Domain } from "../models/Domain";
import { responses } from "../config/strings";
import constants from "../config/constants";
import { isDateInFuture } from "../lib/utils";
import { NextApiResponse } from "next";
import ApiRequest from "../models/ApiRequest";
import { createUser } from "../graphql/users/logic";

const { domainNameForSingleTenancy } = constants;

const getDomainBasedOnSubdomain = async (
    subdomain: string,
): Promise<Domain | null> => {
    return await DomainModel.findOne({ name: subdomain, deleted: false });
};

const getDomainBasedOnCustomDomain = async (
    customDomain: string,
): Promise<Domain | null> => {
    return await DomainModel.findOne({ customDomain, deleted: false });
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

export default async function verifyDomain(
    req: ApiRequest,
    res: NextApiResponse,
    next: any,
): Promise<void> {
    let domain: Domain | null;

    if (process.env.MULTITENANT === "true") {
        const { host } = req.headers;

        if (!host) {
            throw new Error(responses.domain_missing);
        }

        domain = await getDomain(host);

        if (!domain) {
            return res.status(404).json({
                message: `${responses.domain_doesnt_exist}: ${host?.split(
                    ".",
                )[0]}`,
            });
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
                        return res.status(404).json({
                            message: responses.not_valid_subscription,
                        });
                    }
                } else {
                    return res
                        .status(404)
                        .json({ message: responses.not_valid_subscription });
                }
            } catch (err: any) {
                console.error(err);
                return res
                    .status(404)
                    .json({ message: responses.not_valid_subscription });
            }

            const currentDate = new Date();
            const dateAfter24Hours = new Date(currentDate.getTime() + 86400000);
            domain.checkSubscriptionStatusAfter = dateAfter24Hours;
            await (domain as any).save();
        }
    } else {
        domain = await DomainModel.findOne({
            name: domainNameForSingleTenancy,
        });

        if (!domain) {
            if (!process.env.SUPER_ADMIN_EMAIL) {
                console.error(responses.domain_super_admin_email_missing);
                process.exit(1);
            }

            domain = await DomainModel.create({
                name: domainNameForSingleTenancy,
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
            });
        }
    }

    if (domain!.firstRun) {
        domain!.firstRun = false;
        await createUser({
            domain: domain!,
            email: domain!.email,
            superAdmin: true,
        });
        (domain! as any).save();
    }

    req.subdomain = domain!;
    next();
}
