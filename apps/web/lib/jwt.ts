import { Strategy, StrategyOptions } from "passport-jwt";
import constants from "../config/constants";
import User from "../models/User";
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

export default new Strategy(jwtStrategyOptions, async function (
    req: any,
    jwtToken: { email: string; domain: string },
    done: any,
) {
    const { email, domain } = jwtToken;

    if (domain !== req.subdomain._id.toString()) {
        return done(null, false);
    }

    try {
        const user = await User.findOne({
            email,
            domain,
            active: true,
        });
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    } catch (e: any) {
        return done(e, false);
    }
});
