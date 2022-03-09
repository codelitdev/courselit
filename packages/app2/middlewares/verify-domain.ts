import Domain from '../models/Domain';
import Subscriber from '../models/Subscriber';
import { responses } from '../config/strings';
import constants from '../config/constants';
import { isSubscriptionValid } from '../lib/utils'; 
import { NextApiRequest, NextApiResponse } from 'next';

const {
  domainNameForSingleTenancy,
  placeholderEmailForSingleTenancy,
} = constants;

const getDomainBasedOnSubdomain = async (subdomain: string) => {
  return await Domain.findOne({ name: subdomain, deleted: false });
};

const getDomainBasedOnCustomDomain = async (customDomain: string) => {
  return await Domain.findOne({ customDomain, deleted: false });
};

const getDomain = async ({ hostName, domainName }: { hostName: string, domainName: string }) => {
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

export default async function verifyDomain (req: NextApiRequest, res: NextApiResponse) {
    if (process.env.MULTITENANT === "true") {
        const domainName = req.headers.host?.split(".")[0]

        if (!domainName) {
            throw new Error(responses.domain_missing);
        }

        const domain = await getDomain({
            hostName: req.headers.host || "",
            domainName,
        });

        if (!domain) {
            throw new Error(responses.domain_doesnt_exist);
        }

        const validSubscription = await hasValidSubscription(domain.email);
        if (!validSubscription) {
            throw new Error(responses.not_valid_subscription);
        }

        req.headers.subdomain = JSON.stringify(domain) 
    } else {
        let domain = await Domain.findOne({ name: domainNameForSingleTenancy });

        if (!domain) {
            domain = await Domain.create({
                name: domainNameForSingleTenancy,
                email: placeholderEmailForSingleTenancy,
            });
        }

        req.headers.subdomain = JSON.stringify(domain) 
    }
}