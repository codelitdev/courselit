import { Strategy } from "passport-magic-link";
import { User } from "../models/User";
import UserModel from "../models/User";
import constants from "../config/constants";
import { NextApiRequest } from "next";
import { generateMagicLink } from "./utils";
import pug from "pug";
import { send } from "../services/mail";
import { responses } from "../config/strings";
import LoginEmailTemplate from "../templates/login-email";
import ApiRequest from "../models/ApiRequest";
import { createUser } from "../graphql/users/logic";

export default new Strategy(
    {
        secret: constants.jwtSecret,
        userFields: ["email"],
        tokenField: "token",
        passReqToCallbacks: true,
    },
    async (req: NextApiRequest, user: User, token: string) => {
        const magiclink = generateMagicLink({
            token,
            hostname: req.headers["host"] || "",
            secure: req.headers["x-forwarded-proto"] ? true : false,
            redirect: req.body.redirect,
        });
        const emailBody = pug.render(LoginEmailTemplate, { magiclink });
        return await send({
            to: [user.email],
            subject: `${responses.sign_in_mail_prefix} ${req.headers["host"]}`,
            body: emailBody,
        });
    },
    async (req: ApiRequest, user: User) => {
        let dbUser: User | null = await UserModel.findOne({
            email: user.email,
            domain: req.subdomain!._id,
        });

        if (!dbUser) {
            dbUser = await createUser({
                domain: req.subdomain!,
                email: user.email,
            });
        }

        return dbUser.active ? dbUser : null;
    }
);
