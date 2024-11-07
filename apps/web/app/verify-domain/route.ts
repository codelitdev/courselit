import DomainModel, { Domain } from "../../models/Domain";
import { responses } from "../../config/strings";
import constants from "../../config/constants";
import { isDateInFuture } from "../../lib/utils";
import { createUser } from "../../graphql/users/logic";
import { headers } from "next/headers";
import connectToDatabase from "../../services/db";

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

export async function GET(req: Request) {
    const headerList = headers();
    let domain: Domain | null;

    await connectToDatabase();

    if (process.env.MULTITENANT === "true") {
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

    return Response.json({
        success: true,
        domain: domain!.name,
        logo: domain!.settings?.logo?.file,
    });
}
