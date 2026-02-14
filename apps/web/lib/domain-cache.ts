import DomainModel, { Domain } from "../models/Domain";

const domainCache = new Map<
    string,
    { data: Record<string, any>; expiresAt: number }
>();
const TTL = 60_000; // 60 seconds

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

export async function getCachedDomain(
    hostName: string,
): Promise<Domain | null> {
    const cached = domainCache.get(hostName);
    if (cached && cached.expiresAt > Date.now()) {
        return DomainModel.hydrate(cached.data) as unknown as Domain;
    }

    const domain = await getDomain(hostName);
    if (domain) {
        domainCache.set(hostName, {
            data: (domain as any).toObject(),
            expiresAt: Date.now() + TTL,
        });
    }
    return domain;
}

export function invalidateDomainCache(hostName: string): void {
    domainCache.delete(hostName);
}
