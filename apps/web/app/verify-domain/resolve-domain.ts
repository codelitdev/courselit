// This is majorly extracted for easier testing of host name resolution
import { Domain } from "@/models/Domain";
import { getCachedDomain, getDomainFromHost } from "@/lib/domain-cache";

export async function resolveDomainFromHost({
    multitenant,
    host,
    domainNameForSingleTenancy,
}: {
    multitenant: boolean;
    host: string | null;
    domainNameForSingleTenancy: string;
}): Promise<Domain | null> {
    if (multitenant) {
        if (!host) {
            return null;
        }
        return getDomainFromHost(host);
    }

    return getCachedDomain(domainNameForSingleTenancy);
}
