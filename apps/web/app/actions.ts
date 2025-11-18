import { headers as headersType } from "next/headers";

export async function getBackendAddress(
    headers: Headers,
): Promise<`${string}://${string}`> {
    return `${headers.get("x-forwarded-proto")}://${headers.get("host")}`;
}

export async function getAddressFromHeaders(headers: typeof headersType) {
    const headersList = await headers();
    const address = await getBackendAddress(headersList);
    return address;
}
