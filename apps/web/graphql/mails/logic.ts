import constants from "@config/constants";
import GQLContext from "@models/GQLContext";
import UserModel, { User } from "@models/User";
import { error } from "../../services/logger";
import { createUser, getUsers } from "../users/logic";
import MailModel, { Mail } from "@models/Mail";
import {
    checkIfAuthenticated,
    makeModelTextSearchable,
} from "../../lib/graphql";
import { responses } from "../../config/strings";
import mongoose from "mongoose";
import SearchData from "./models/search-data";
import { checkPermission } from "@courselit/utils";
import {
    Constants,
    Email,
    Sequence,
    UIConstants,
} from "@courselit/common-models";
import { send } from "../../services/mail";
import CourseModel, { Course } from "@models/Course";
import DownloadLinkModel from "@models/DownloadLink";
import pug from "pug";
import digitalDownloadTemplate from "../../templates/download-link";
import finalizePurchase from "../../lib/finalize-purchase";
import SequenceModel, { AdminSequence } from "@models/Sequence";
import OngoingSequence from "@models/OngoingSequence";
import Rule from "@models/Rule";

const { permissions, mailTypes } = constants;
type SequenceType = (typeof mailTypes)[number];

export async function createSubscription(
    email: string,
    ctx: GQLContext,
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
    ctx: GQLContext,
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

export async function createSequence(
    ctx: GQLContext,
): Promise<(Sequence & { creatorId: string }) | null> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    try {
        const sequenceObj: Partial<AdminSequence> = {
            domain: ctx.subdomain._id,
            type: <SequenceType>Constants.mailTypes[1],
            title: "",
            creatorId: ctx.user.userId,
            emails: [
                {
                    templateId: "123",
                    content: "",
                    subject: "first email",
                    delayInMillis: 0,
                    published: false,
                },
            ],
        };
        const sequence = await SequenceModel.create(sequenceObj);
        return sequence;
    } catch (e: any) {
        error(e.message, {
            stack: e.stack,
        });
        throw e;
    }
}

export async function createBroadcast(
    ctx: GQLContext,
): Promise<(Sequence & { creatorId: string }) | null> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    try {
        const sequenceObj: Partial<AdminSequence> = {
            domain: ctx.subdomain._id,
            type: <SequenceType>Constants.mailTypes[0],
            title: " ",
            creatorId: ctx.user.userId,
            emails: [
                {
                    templateId: "123",
                    content: " ",
                    subject: " ",
                    delayInMillis: 0,
                    published: false,
                },
            ],
        };
        const sequence = await SequenceModel.create(sequenceObj);
        return sequence;
    } catch (e: any) {
        error(e.message, {
            stack: e.stack,
        });
        throw e;
    }
}

export async function getMail(
    mailId: string,
    ctx: GQLContext,
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

export async function getSequence(
    ctx: GQLContext,
    sequenceId: string,
): Promise<AdminSequence | null> {
    checkIfAuthenticated(ctx);

    const sequence: AdminSequence = await SequenceModel.findOne({
        sequenceId,
        domain: ctx.subdomain._id,
    });

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    return sequence;
}

export async function updateBroadcast({
    ctx,
    sequenceId,
    title,
    filter,
    templateId,
    content,
    delayInMillis,
}: {
    ctx: GQLContext;
    sequenceId: string;
    filter?: string;
    title?: string;
    templateId?: string;
    content?: string;
    delayInMillis?: number;
}): Promise<AdminSequence | null> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const sequence: AdminSequence = await SequenceModel.findOne({
        sequenceId,
        domain: ctx.subdomain._id,
    });

    if (broadcastPublished(sequence)) {
        return sequence;
    }

    if (filter) {
        sequence.broadcastSettings.filter = JSON.parse(filter);
    }
    if (title) {
        sequence.title = title;
        sequence.emails[0].subject = title;
    }
    if (templateId) {
        sequence.emails[0].templateId = templateId;
    }
    if (content) {
        sequence.emails[0].content = content;
    }
    if (typeof delayInMillis !== "undefined") {
        sequence.emails[0].delayInMillis = delayInMillis;
    }

    await (sequence as any).save();

    return sequence;
}

export async function getBroadcasts({
    ctx,
    offset,
    rowsPerPage,
}: {
    ctx: GQLContext;
    offset?: number;
    rowsPerPage?: number;
}): Promise<Pick<Sequence, "sequenceId" | "title" | "emails">[] | null> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const searchSequences = makeModelTextSearchable(SequenceModel);
    const broadcasts: Pick<Sequence, "sequenceId" | "title" | "emails">[] =
        await searchSequences(
            {
                query: {
                    domain: ctx.subdomain._id,
                    type: <SequenceType>Constants.mailTypes[0],
                },
                offset: offset || 1,
                graphQLContext: ctx,
            },
            {
                itemsPerPage: rowsPerPage || constants.itemsPerPage,
                sortByColumn: "_id",
                sortOrder: -1,
            },
        );

    return broadcasts.map((broadcast) => ({
        sequenceId: broadcast.sequenceId,
        title: broadcast.title,
        emails: broadcast.emails,
    }));
}

export async function getSequenceCount({
    ctx,
    type,
}: {
    ctx: GQLContext;
    type: SequenceType;
}): Promise<number> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    return await SequenceModel.countDocuments({
        domain: ctx.subdomain._id,
        type,
    });
}

const broadcastPublished = (sequence: AdminSequence): boolean =>
    sequence.type === "broadcast" && sequence.emails[0].published;

export async function toggleEmailPublishStatus({
    ctx,
    sequenceId,
    emailId,
}: {
    ctx: GQLContext;
    sequenceId: string;
    emailId: string;
}): Promise<boolean> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const sequence = await SequenceModel.findOne({
        domain: ctx.subdomain._id,
        sequenceId,
    });
    if (!sequence) {
        return false;
    }

    const email = sequence.emails.find(
        (email: Email) => email.emailId === emailId,
    );
    if (!email) {
        return false;
    }

    if (sequence.type === "broadcast" && sequence.report?.broadcast?.lockedAt) {
        return false;
    }

    if (email.delayInMillis && email.delayInMillis < new Date().getTime()) {
        throw new Error(responses.past_date);
    }

    email.published = !email.published;

    await sequence.save();

    if (sequence.type === "broadcast") {
        if (email.published) {
            if (email.delayInMillis) {
                await addRuleToSendLater({ sequence, ctx });
            } else {
                await Promise.all([
                    addBroadcastToOngoingSequence({ sequence, ctx }),
                    (async () => {
                        sequence.report = {
                            broadcast: {
                                lockedAt: new Date(),
                            },
                        };
                        await (sequence as any).save();
                    })(),
                ]);
            }
        } else {
            await removeRuleToSendLater({ sequence, ctx });
        }
    }

    return sequence;
}

async function addBroadcastToOngoingSequence({
    sequence,
    ctx,
}: {
    sequence: Sequence;
    ctx: GQLContext;
}) {
    const allUsers = await getUsers({
        searchData: {
            filters: JSON.stringify(sequence.broadcastSettings.filter),
        },
        ctx,
        noPagination: true,
        hasMailPermissions: true,
    });
    const ongoingSequences = allUsers.map((user) => ({
        domain: ctx.subdomain._id,
        sequenceId: sequence.sequenceId,
        userId: user.userId,
        nextEmailId: sequence.emails[0].emailId,
        nextEmailScheduledTime: new Date().getTime(),
    }));
    await OngoingSequence.insertMany(ongoingSequences);
}

async function addRuleToSendLater({
    sequence,
    ctx,
}: {
    sequence: Sequence;
    ctx: GQLContext;
}) {
    await Rule.create({
        domain: ctx.subdomain._id,
        event: Constants.eventTypes[4],
        action: Constants.actionTypes[2],
        data: {
            sequenceId: sequence.sequenceId,
            dateInMillis: sequence.emails[0].delayInMillis,
        },
    });
}

async function removeRuleToSendLater({
    sequence,
    ctx,
}: {
    sequence: Sequence;
    ctx: GQLContext;
}) {
    await Rule.deleteMany({
        domain: ctx.subdomain._id,
        event: Constants.eventTypes[4],
        action: Constants.actionTypes[2],
        "data.sequenceId": sequence.sequenceId,
    });
}

export async function getMails(
    searchData: SearchData = {},
    ctx: GQLContext,
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
        },
    );

    return mails;
}

export async function getMailsCount(
    searchData: SearchData = {},
    ctx: GQLContext,
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
    creatorId: string,
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
    ctx: GQLContext,
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

export async function sendCourseOverMail(
    courseId: string,
    email: string,
    ctx: GQLContext,
): Promise<boolean> {
    const course: Course | null = await CourseModel.findOne({
        courseId,
        domain: ctx.subdomain._id,
        published: true,
        costType: constants.costEmail,
    });

    if (!course) {
        throw new Error(responses.item_not_found);
    }

    let dbUser: User | null = await UserModel.findOne({
        email,
        domain: ctx.subdomain._id,
    });

    if (!dbUser) {
        dbUser = await createUser({
            domain: ctx.subdomain!,
            email: email,
            lead: constants.leadDownload,
        });
    }

    await finalizePurchase(dbUser.userId, course.courseId);

    if (course.lessons.length === 0) {
        return true;
    }

    await createTemplateAndSendMail({ course, ctx, user: dbUser });
    return true;
}

async function createTemplateAndSendMail({
    course,
    ctx,
    user,
}: {
    course: Course;
    ctx: GQLContext;
    user: User;
}) {
    const downloadLink = await DownloadLinkModel.create({
        domain: ctx.subdomain!._id,
        courseId: course.courseId,
        userId: user.userId,
    });

    const emailBody = pug.render(digitalDownloadTemplate, {
        downloadLink: `${ctx.address}/api/download/${downloadLink.token}`,
        loginLink: `${ctx.address}/login`,
        courseName: course.title,
        name: course.creatorName || ctx.subdomain.settings.title || "",
    });

    await send({
        to: [user.email],
        subject: `Thank you for signing up for ${course.title}`,
        body: emailBody,
    });
}
