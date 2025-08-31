import { Domain } from "@courselit/common-models";

export function getSiteUrl(domain: Domain) {
    return `${process.env.PROTOCOL || "https"}://${
        domain.customDomain
            ? `${domain.customDomain}`
            : process.env.MULTITENANT === "true"
              ? `${domain.name}.${process.env.DOMAIN}`
              : process.env.DOMAIN
    }`;
}
