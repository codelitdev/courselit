import DomainModel, { Domain } from "../models/Domain";
import Subscriber from "../models/Subscriber";
import { responses } from "../config/strings";
import constants from "../config/constants";
import { isSubscriptionValid } from "../lib/utils";
import { NextApiResponse } from "next";
import ApiRequest from "../models/ApiRequest";
import { createUser } from "../graphql/users/logic";

const { domainNameForSingleTenancy } = constants;

const getDomainBasedOnSubdomain = async (
    subdomain: string
): Promise<Domain | null> => {
    return await DomainModel.findOne({ name: subdomain, deleted: false });
};

const getDomainBasedOnCustomDomain = async (
    customDomain: string
): Promise<Domain | null> => {
    return await DomainModel.findOne({ customDomain, deleted: false });
};

const getDomain = async ({
    hostName,
    domainName,
}: {
    hostName: string;
    domainName: string;
}): Promise<Domain | null> => {
    const domainBoundToLiveWebsite = new RegExp(`${process.env.DOMAIN}$`);

    if (
        process.env.NODE_ENV === "production" &&
        !domainBoundToLiveWebsite.test(hostName)
    ) {
        return await getDomainBasedOnCustomDomain(hostName);
    } else {
        return await getDomainBasedOnSubdomain(domainName);
    }
};

const hasValidSubscription = async (email: string): Promise<boolean> => {
    const subscriber = await Subscriber.findOne({ email });

    if (!subscriber) {
        return false;
    }

    if (!isSubscriptionValid(subscriber.subscriptionEndsAfter)) {
        return false;
    }

    return true;
};

export default async function verifyDomain(
    req: ApiRequest,
    res: NextApiResponse,
    next: any
): Promise<void> {
    let domain: Domain | null;

    if (process.env.MULTITENANT === "true") {
        const domainName = req.headers.host?.split(".")[0];

        if (!domainName) {
            throw new Error(responses.domain_missing);
        }

        domain = await getDomain({
            hostName: req.headers.host || "",
            domainName,
        });

        if (!domain) {
            return res.status(404).json({
                message: `${responses.domain_doesnt_exist}: ${domainName}`,
            });
            //throw new Error(`${responses.domain_doesnt_exist}: ${domainName}`);
        }

        const validSubscription = await hasValidSubscription(domain.email);
        if (!validSubscription) {
            return res
                .status(404)
                .json({ message: responses.not_valid_subscription });
            //throw new Error(responses.not_valid_subscription);
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
            });
        }
    }

    if (!domain!.settings) {
        domain!.settings = {};
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
