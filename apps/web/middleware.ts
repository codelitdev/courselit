import "server-only";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    // verifyDomainNative(request)
    const requestHeaders = request.headers;
    const backend = getBackendAddress(requestHeaders);
    // console.log(request)
    const response = await fetch(`${backend}/lol`);
}

export const config = {
    matcher: ["/"],
};

export const getBackendAddress = (
    headers: Headers,
): `${string}://${string}` => {
    return `${headers.get("x-forwarded-proto")}://${headers.get("host")}`;
};
