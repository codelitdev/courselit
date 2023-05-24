import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import UserModel, { User } from "../../models/User";
import { error } from "../../services/logger";
import { createUser, getUsers } from "../users/logic";
import MailModel, { Mail } from "../../models/Mail";
import {
    checkIfAuthenticated,
    makeModelTextSearchable,
} from "../../lib/graphql";
import { responses } from "../../config/strings";
import mongoose from "mongoose";
import SearchData from "./models/search-data";
import { checkPermission } from "@courselit/utils";
import { UIConstants } from "@courselit/common-models";
import { send } from "../../services/mail";

const { permissions } = constants;

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
            await createUser({
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

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    try {
        let emails = [];
        let emptySearchData = Object.keys(searchData).length === 0;
        if (!emptySearchData) {
            const matchingUsers = await getUsers({
                searchData,
                ctx,
                noPagination: true,
                hasMailPermissions: true,
            });
            emails = matchingUsers.map((x) => x.email);
        }
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
        throw e;
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

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    return mail;
}

export async function getMails(
    searchData: SearchData = {},
    ctx: GQLContext
): Promise<Mail | null> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

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

export async function getMailsCount(
    searchData: SearchData = {},
    ctx: GQLContext
): Promise<number> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const query = buildQueryFromSearchData(ctx.subdomain._id, searchData);
    return await MailModel.countDocuments(query);
}

const buildQueryFromSearchData = (
    domain: mongoose.Types.ObjectId,
    searchData: SearchData = {},
    creatorId: string
) => {
    const query: Record<string, unknown> = { domain };
    if (searchData.creatorId) {
        query.creatorId = searchData.creatorId;
    }
    if (searchData.searchText) query.$text = { $search: searchData.searchText };

    return query;
};

export async function updateMail(
    mailData: Pick<Mail, "mailId" | "to" | "subject" | "body"> = {},
    ctx: GQLContext
): Promise<Mail | null> {
    checkIfAuthenticated(ctx);

    let mail: Mail | null = await MailModel.findOne({
        mailId: mailData.mailId,
        domain: ctx.subdomain._id,
    });

    if (!isNotUndefined(mail)) {
        throw new Error(responses.item_not_found);
    }

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    if (
        mailData.subject &&
        mailData.subject.length > UIConstants.MAIL_SUBJECT_MAX_LENGTH
    ) {
        throw new Error(responses.mail_subject_length_exceeded);
    }

    if (mailData.to) {
        mailData.to = removeEmptyMembers(Array.from(new Set(mailData.to)));
    }

    if (mailData.to && mailData.to.length > UIConstants.MAIL_MAX_RECIPIENTS) {
        throw new Error(responses.mail_max_recipients_exceeded);
    }

    try {
        for (const key of Object.keys(mailData)) {
            if (key === "mailId") continue;

            mail[key] = mailData[key];
        }

        mail = await (mail as any).save();

        return mail;
    } catch (e: any) {
        error(e.message, {
            stack: e.stack,
        });
        return null;
    }
}

const removeEmptyMembers = (arr: string[]) =>
    arr.filter((x) => x.trim() !== "");

function isNotUndefined(mail: Mail | null): mail is Mail {
    return !!mail;
}

export async function sendMail(mailId: string, ctx: GQLContext): Promise<Mail> {
    checkIfAuthenticated(ctx);

    let mail: Mail | null = await MailModel.findOne({
        mailId: mailId,
        domain: ctx.subdomain._id,
    });

    if (!isNotUndefined(mail)) {
        throw new Error(responses.item_not_found);
    }

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    if (mail.published) {
        throw new Error(responses.mail_already_sent);
    }

    if (!mail.to || !mail.subject || !mail.body) {
        throw new Error(responses.invalid_mail);
    }

    const from = `${ctx.subdomain.settings.title || ctx.subdomain.name} ${
        ctx.user.email
    }`;

    await send({
        from,
        to: mail.to,
        subject: mail.subject,
        body: mail.body,
    });

    mail.published = true;
    try {
        await (mail as any).save();

        return mail;
    } catch (e: any) {
        error(e.message, {
            stack: e.stack,
        });
        throw new Error(responses.internal_error);
    }
}
