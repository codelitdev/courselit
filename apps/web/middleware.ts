import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth(async (request: NextRequest) => {
    const requestHeaders = request.headers;
    const backend = getBackendAddress(requestHeaders);
    try {
        const response = await fetch(`${backend}/verify-domain`);

        if (!response.ok) {
            throw new Error();
        }

        const resp = await response.json();

        requestHeaders.set("domain", resp.domain);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } catch (err) {
        return NextResponse.rewrite(new URL("/notfound", request.url));
    }
});

// export async function middleware(request: NextRequest) {
//     const requestHeaders = request.headers;
//     const backend = getBackendAddress(requestHeaders);
//     try {
//         const response = await fetch(`${backend}/verify-domain`);

//         if (!response.ok) {
//             throw new Error();
//         }

//         const resp = await response.json();

//         requestHeaders.set("domain", resp.domain);

//         return NextResponse.next({
//             request: {
//                 headers: requestHeaders,
//             },
//         });
//     } catch (err) {
//         return NextResponse.rewrite(new URL("/notfound", request.url));
//     }
// }

export const config = {
    matcher: ["/", "/api/:path*"],
};

const getBackendAddress = (headers: Headers): `${string}://${string}` => {
    return `${headers.get("x-forwarded-proto")}://${headers.get("host")}`;
};
