import DomainModel, { Domain } from "../models/Domain";

type CacheEntry = { data: Record<string, any>; expiresAt: number };

const domainCacheByName = new Map<string, CacheEntry>();
const domainCacheByHost = new Map<string, CacheEntry>();
const TTL = 60_000; // 60 seconds

const normalizeHost = (hostName: string): string =>
    (hostName || "").split(",")[0].trim().split(":")[0].toLowerCase();
const normalizeDomainName = (domainName: string): string =>
    (domainName || "").trim().toLowerCase();

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

export async function getDomainFromHost(
    hostName: string,
): Promise<Domain | null> {
    const normalizedHost = normalizeHost(hostName);

    // Check host cache first
    const cached = domainCacheByHost.get(normalizedHost);
    if (cached && cached.expiresAt > Date.now()) {
        return DomainModel.hydrate(cached.data) as unknown as Domain;
    }

    let domain: Domain | null = null;
    const [subdomain] = normalizedHost.split(".");
    const configuredRootDomain = normalizeHost(process.env.DOMAIN || "");
    const isConfiguredSubdomain = configuredRootDomain
        ? normalizedHost.endsWith(`.${configuredRootDomain}`)
        : false;

    if (isConfiguredSubdomain) {
        domain = await getDomainBasedOnSubdomain(subdomain);
    } else {
        const customDomain = await getDomainBasedOnCustomDomain(normalizedHost);
        if (customDomain) {
            domain = customDomain;
        } else if (
            !configuredRootDomain &&
            subdomain &&
            subdomain !== normalizedHost
        ) {
            // Fallback for local/proxy setups where root domain env may not match host.
            domain = await getDomainBasedOnSubdomain(subdomain);
        }
    }

    if (domain) {
        domainCacheByHost.set(normalizedHost, {
            data: (domain as any).toObject
                ? (domain as any).toObject()
                : domain,
            expiresAt: Date.now() + TTL,
        });
        cacheDomainByName(domain);
    }

    return domain;
}

export function cacheDomainByName(domain: Domain): void {
    if (!domain?.name) {
        return;
    }

    domainCacheByName.set(normalizeDomainName(domain.name), {
        data: (domain as any).toObject ? (domain as any).toObject() : domain,
        expiresAt: Date.now() + TTL,
    });
}

export async function getCachedDomain(
    domainName: string,
): Promise<Domain | null> {
    const normalizedDomainName = normalizeDomainName(domainName);
    if (!normalizedDomainName) {
        return null;
    }

    const cached = domainCacheByName.get(normalizedDomainName);
    if (cached && cached.expiresAt > Date.now()) {
        return DomainModel.hydrate(cached.data) as unknown as Domain;
    }

    const domain = await getDomainBasedOnSubdomain(normalizedDomainName);
    if (domain) {
        cacheDomainByName(domain);
    }
    return domain;
}

export function invalidateDomainCache(domainName: string): void {
    const normalizedDomainName = normalizeDomainName(domainName);
    domainCacheByName.delete(normalizedDomainName);

    // Iterate over host cache and delete entries that have the same domain name
    for (const [host, entry] of Array.from(domainCacheByHost.entries())) {
        if (normalizeDomainName(entry.data.name) === normalizedDomainName) {
            domainCacheByHost.delete(host);
        }
    }
}
