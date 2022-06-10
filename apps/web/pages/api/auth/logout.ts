import { NextApiRequest, NextApiResponse } from "next";
import { removeTokenCookie } from "../../../lib/auth-cookies";

export default async function logout(
    req: NextApiRequest,
    res: NextApiResponse
) {
    removeTokenCookie(res);
    res.writeHead(302, { Location: "/" });
    res.end();
}
