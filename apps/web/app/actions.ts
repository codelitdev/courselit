import { headers as headersType } from "next/headers";

export const getBackendAddress = (
    headers: Headers,
): `${string}://${string}` => {
    return `${headers.get("x-forwarded-proto")}://${headers.get("host")}`;
};

export async function getAddressFromHeaders(headers: typeof headersType) {
    const headersList = await headers();
    const address = getBackendAddress(headersList);
    return address;
}
