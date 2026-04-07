import { headers as headersType } from "next/headers";

export async function getBackendAddress(
    headers: Headers,
): Promise<`${string}://${string}`> {
    const protocol = headers.get("x-forwarded-proto") || "http";
    const forwardedHost = headers
        .get("x-forwarded-host")
        ?.split(",")[0]
        ?.trim();
    const host = forwardedHost || headers.get("host");

    return `${protocol}://${host}`;
}

export async function getAddressFromHeaders(headers: typeof headersType) {
    const headersList = await headers();
    const address = await getBackendAddress(headersList);
    return address;
}
