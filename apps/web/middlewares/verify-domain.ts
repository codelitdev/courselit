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
    console.log(
        "getDomain:1",
        isProduction,
        isSubdomain,
        hostName,
        process.env.DOMAIN,
    );

    if (isProduction && (hostName === process.env.DOMAIN || !isSubdomain)) {
        console.log("getDomain:2", "getDomainBasedOnCustomDomain");
        return getDomainBasedOnCustomDomain(hostName);
    }

    console.log("getDomain:2", "getDomainBasedOnSubdomain");
    const [subdomain] = hostName?.split(".");
    return getDomainBasedOnSubdomain(subdomain);
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

        const validSubscription = await hasValidSubscription(domain.email);
        if (!validSubscription) {
            return res
                .status(404)
                .json({ message: responses.not_valid_subscription });
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
