import { NextApiRequest, NextApiResponse } from "next";
import { serialize, parse } from "cookie";
import constants from "../config/constants";

export function setTokenCookie(res: NextApiResponse, token: string) {
    const cookie = serialize(constants.jwtTokenCookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
    });

    res.setHeader("Set-Cookie", cookie);
}

export function removeTokenCookie(res: NextApiResponse) {
    const cookie = serialize(constants.jwtTokenCookieName, "", {
        maxAge: -1,
        path: "/",
    });

    res.setHeader("Set-Cookie", cookie);
}

function parseCookie(req: NextApiRequest): Record<string, any> {
    // For API Routes we don't need to parse the cookie
    if (req.cookies) return req.cookies;

    // For pages we have to parse the cookies
    const cookie = req.headers?.cookie;
    return parse(cookie || "");
}

export function getTokenCookie(req: NextApiRequest): string {
    const cookies = parseCookie(req);
    return cookies[constants.jwtTokenCookieName];
}
