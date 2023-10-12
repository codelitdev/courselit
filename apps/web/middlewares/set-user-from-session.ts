import { NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import ApiRequest from "../models/ApiRequest";
import User from "../models/User";
import { authOptions } from "../pages/api/auth/[...nextauth]";

export default async function setUserFromSession(
    req: ApiRequest,
    res: NextApiResponse,
    next: any,
): Promise<void> {
    const session = await getServerSession(req, res, authOptions);

    if (session) {
        try {
            const user = await User.findOne({
                email: session.user.email,
                domain: req.subdomain._id,
                active: true,
            });
            if (user) {
                req.user = user;
            }
        } catch (e: any) {
            next();
        }
    }

    next();
}
