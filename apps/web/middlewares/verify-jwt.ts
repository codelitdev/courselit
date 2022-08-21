import { NextApiRequest, NextApiResponse } from "next";

export default function verifyJwt(passport: any) {
    return (req: NextApiRequest, res: NextApiResponse, next: any) => {
        passport.authenticate("jwt", { session: false })(req, res, next);
    };
}
