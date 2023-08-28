import { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "../services/db";

export default async function (
    req: NextApiRequest,
    res: NextApiResponse,
    next: any,
) {
    await connectToDatabase();
    next();
}
