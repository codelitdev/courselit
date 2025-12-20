import { NextResponse, type NextRequest } from "next/server";
import { getBackendAddress } from "@/app/actions";
import { auth } from "./auth";

export async function proxy(request: NextRequest) {
    const requestHeaders = request.headers;
    const backend = await getBackendAddress(requestHeaders);

    if (request.nextUrl.pathname === "/healthy") {
        return Response.json({ success: true });
    }

    try {
        const response = await fetch(`${backend}/verify-domain`);

        if (!response.ok) {
            throw new Error();
        }

        const resp = await response.json();

        requestHeaders.set("domain", resp.domain);
        requestHeaders.set("domainId", resp.domainId);
        requestHeaders.set("domainEmail", resp.domainEmail);
        requestHeaders.set("domainTitle", resp.domainTitle || "");
        requestHeaders.set(
            "hideCourseLitBranding",
            resp.hideCourseLitBranding || false,
        );
        if (resp.ssoTrustedDomain) {
            requestHeaders.set("ssoTrustedDomain", resp.ssoTrustedDomain);
        }

        if (request.nextUrl.pathname === "/favicon.ico") {
            try {
                if (resp.logo) {
                    const response = await fetch(resp.logo);
                    if (response.ok) {
                        const blob = await response.blob();
                        return new NextResponse(blob, {
                            headers: {
                                "content-type": "image/webp",
                            },
                        });
                    } else {
                        return NextResponse.rewrite(
                            new URL(`/default-favicon.ico`, request.url),
                        );
                    }
                } else {
                    return NextResponse.rewrite(
                        new URL(`/default-favicon.ico`, request.url),
                    );
                }
            } catch (err) {
                return NextResponse.rewrite(
                    new URL(`/default-favicon.ico`, request.url),
                );
            }
        }

        if (request.nextUrl.pathname.startsWith("/dashboard")) {
            const session = await auth.api.getSession({
                headers: requestHeaders,
            });
            if (!session) {
                return NextResponse.redirect(
                    new URL(
                        `/login?redirect=${encodeURIComponent(
                            request.nextUrl.pathname,
                        )}`,
                        request.url,
                    ),
                );
            }
        }

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } catch (err) {
        return Response.json(
            { success: false, error: err.message },
            { status: 404 },
        );
    }
}

export const config = {
    matcher: [
        "/",
        "/favicon.ico",
        "/api/:path*",
        "/healthy",
        "/dashboard/:path*",
    ],
};
