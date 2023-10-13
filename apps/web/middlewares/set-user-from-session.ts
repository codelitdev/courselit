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
        const user = await User.findOne({
            email: session.user.email,
            domain: req.subdomain._id,
            active: true,
        });

        if (user) {
            req.user = user;
            next();
        } else {
            return res.status(401).json({});
        }
    } else {
        return res.status(401).json({});
    }
}
