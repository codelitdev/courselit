import { NextApiRequest } from "next";
import { Strategy, ExtractJwt, StrategyOptions } from "passport-jwt";
import constants from "../config/constants";
import UserModel, { User } from "../models/User";
import { getLoginSession } from "./auth";

const extractFromCookie = (req: any): string => getLoginSession(req);

const jwtStrategyOptions: StrategyOptions = {
    jwtFromRequest: extractFromCookie,
    secretOrKey: constants.jwtSecret,
    jsonWebTokenOptions: {
        expiresIn: constants.jwtExpire,
    },
    passReqToCallback: true,
};

export default new Strategy(jwtStrategyOptions, function (
    req: any,
    jwtToken: { email: string; domain: string },
    done: any
) {
    const { email, domain } = jwtToken;

    if (domain !== req.subdomain._id.toString()) {
        return done(null, false);
    }

    UserModel.findOne(
        { email, domain, active: true },
        function (err: Error, user: User) {
            if (err) {
                return done(err, false);
            }

            if (user) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        }
    );
});
