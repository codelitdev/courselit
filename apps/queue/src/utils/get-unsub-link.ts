import { Domain } from "@courselit/common-models";
import { getSiteUrl } from "./get-site-url";

export function getUnsubLink(domain: Domain, unsubscribeToken: string) {
    return `${getSiteUrl(domain)}/api/unsubscribe/${unsubscribeToken}`;
}
