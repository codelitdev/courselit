import { Strategy } from 'passport-magic-link';
import { User } from '../models/User';
import UserModel from '../models/User';
import constants from '../config/constants';
import { NextApiRequest } from 'next';
import { generateMagicLink } from './utils';
import pug from 'pug';
import { send } from '../services/mail';
import { responses } from '../config/strings';
import LoginEmailTemplate from '../templates/login-email';

export default new Strategy(
    {
        secret: constants.jwtSecret,
        userFields: ["email"],
        tokenField: "token",
        passReqToCallbacks: true,
    },
    async (req: NextApiRequest, user: User, token: string) => {
        console.log('Came here', req.headers);
        const magiclink = generateMagicLink({
            token,
            hostname: req.headers['host'] || "",
            secure: req.headers["x-forwarded-proto"] ? true : false,
            redirect: req.body.redirect,
        });
        const emailBody = pug.render(LoginEmailTemplate, { magiclink });
        return await send({
            to: user.email,
            subject: `${responses.sign_in_mail_prefix} ${req.headers['host']}`,
            body: emailBody,
        });
    },
    async (req: NextApiRequest, user: User) => {
        console.log('Verify user', user, req.headers.subdomain)
        // TODO: Type domain
        const subdomain: Record<string, any> = JSON.parse(req.headers.subdomain);
        let dbUser = await UserModel.findOne({
            email: user.email,
            domain: subdomain._id,
        });

        if (!dbUser) {
            const newUser: User = {
                domain: subdomain._id,
                email: user.email,
                active: true,
                purchases: [],
                permissions: []
            };
            const notTheFirstUserOfDomain = await UserModel.countDocuments({
                domain: subdomain._id,
            });
            if (notTheFirstUserOfDomain) {
                newUser.permissions = [constants.permissions.enrollInCourse];
            } else {
            newUser.permissions = [
                constants.permissions.manageCourse,
                constants.permissions.manageAnyCourse,
                constants.permissions.publishCourse,
                constants.permissions.manageMedia,
                constants.permissions.manageAnyMedia,
                constants.permissions.uploadMedia,
                constants.permissions.viewAnyMedia,
                constants.permissions.manageLayout,
                constants.permissions.manageThemes,
                constants.permissions.manageMenus,
                constants.permissions.manageWidgets,
                constants.permissions.manageSettings,
                constants.permissions.manageUsers,
            ];
            }
            dbUser = await UserModel.create(newUser);
        }

        return dbUser.active ? dbUser : null;
    }
)