import { NextApiRequest, NextApiResponse } from "next";
import { getTokenCookie, setTokenCookie } from "./auth-cookies";

export function setLoginSession(res: NextApiResponse, token: string) {
    setTokenCookie(res, token);
}

export function getLoginSession(req: NextApiRequest): string {
    const token = getTokenCookie(req);
    return token;
}
