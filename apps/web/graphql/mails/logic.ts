import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import UserModel, { User } from "../../models/User";
import { error } from "../../services/logger";
import { createUser, getUsers } from "../users/logic";
import MailModel, { Mail } from "../../models/Mail";
import {
    checkIfAuthenticated,
    checkOwnershipWithoutModel,
    makeModelTextSearchable,
} from "../../lib/graphql";
import { responses } from "../../config/strings";
import mongoose from "mongoose";
import SearchData from "./models/search-data";
import { send } from "../../services/mail";

export async function createSubscription(
    email: string,
    ctx: GQLContext
): Promise<boolean> {
    try {
        let dbUser: User | null = await UserModel.findOne({
            email,
            domain: ctx.subdomain._id,
        });

        if (!dbUser) {
            dbUser = await createUser({
                domain: ctx.subdomain!,
                email: email,
                lead: constants.leadNewsletter,
            });
        }
    } catch (e: any) {
        error(e.message, {
            stack: e.stack,
        });
        return false;
    }

    return true;
}

export async function createMail(
    searchData: SearchData = {},
    ctx: GQLContext
): Promise<Mail | null> {
    checkIfAuthenticated(ctx);

    try {
        const matchingUsers = await getUsers(searchData, ctx, true);
        const emails = matchingUsers.map((x) => x.email);
        const mail = await MailModel.create({
            domain: ctx.subdomain._id,
            creatorId: ctx.user.userId,
            to: emails,
        });

        return mail;
    } catch (e: any) {
        error(e.message, {
            stack: e.stack,
        });
        return null;
    }
}

export async function getMail(
    mailId: string,
    ctx: GQLContext
): Promise<Mail | null> {
    checkIfAuthenticated(ctx);

    const mail: Mail | null = await MailModel.findOne({
        mailId,
        domain: ctx.subdomain._id,
    });

    if (!checkOwnershipWithoutModel(mail, ctx)) {
        throw new Error(responses.item_not_found);
    }

    return mail;
}

export async function getMails(
    searchData: SearchData = {},
    ctx: GQLContext
): Promise<Mail | null> {
    checkIfAuthenticated(ctx);
    /*
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }
    */

    const searchMails = makeModelTextSearchable(MailModel);
    const query = buildQueryFromSearchData(ctx.subdomain._id, searchData);
    const mails = await searchMails(
        {
            query,
            offset: searchData.offset || 1,
            graphQLContext: ctx,
        },
        {
            itemsPerPage: searchData.rowsPerPage || constants.itemsPerPage,
            sortByColumn: "updatedAt",
            sortOrder: -1,
        }
    );

    return mails;
}

const buildQueryFromSearchData = (
    domain: mongoose.Types.ObjectId,
    searchData: SearchData = {},
    creatorId: string
) => {
    const query: Record<string, unknown> = { domain };
    if (creatorId) {
        query.creatorId = creatorId;
    }
    if (searchData.searchText) query.$text = { $search: searchData.searchText };

    return query;
};

export async function updateMail(
    mailData: Pick<Mail, "mailId" | "to" | "subject" | "body">,
    ctx: GQLContext
): Promise<Mail> {
    checkIfAuthenticated(ctx);

    let mail: Mail | null = await MailModel.findOne({
        mailId: mailData.mailId,
        domain: ctx.subdomain._id,
    });

    if (!checkOwnershipWithoutModel(mail, ctx)) {
        throw new Error(responses.item_not_found);
    }

    try {
        for (const key of Object.keys(mailData)) {
            if (key === "mailId") continue;

            mail[key] = mailData[key];
        }

        mail = await mail.save();

        return mail;
    } catch (e: any) {
        error(e.message, {
            stack: e.stack,
        });
        return null;
    }
}

export async function sendMail(mailId: string, ctx: GQLContext): Promise<Mail> {
    checkIfAuthenticated(ctx);

    let mail: Mail | null = await MailModel.findOne({
        mailId: mailId,
        domain: ctx.subdomain._id,
    });

    if (!checkOwnershipWithoutModel(mail, ctx)) {
        throw new Error(responses.item_not_found);
    }

    try {
        await send({
            to: mail.to,
            subject: mail.subject,
            body: mail.body,
        });

        mail.published = true;
        mail = await mail.save();

        return mail;
    } catch (e: any) {
        error(e.message, {
            stack: e.stack,
        });
        throw e;
    }
}
