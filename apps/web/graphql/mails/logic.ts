import constants from "@config/constants";
import GQLContext from "@models/GQLContext";
import UserModel, { User } from "@models/User";
import { error } from "../../services/logger";
import { createUser } from "../users/logic";
import MailModel, { Mail } from "@models/Mail";
import {
    checkIfAuthenticated,
    makeModelTextSearchable,
} from "../../lib/graphql";
import { responses, internal } from "../../config/strings";
import SearchData from "./models/search-data";
import { checkPermission, generateUniqueId } from "@courselit/utils";
import { Constants, Email, Sequence } from "@courselit/common-models";
import CourseModel, { Course } from "@models/Course";
import finalizePurchase from "../../lib/finalize-purchase";
import SequenceModel, { AdminSequence } from "@models/Sequence";
import { isDateInFuture } from "../../lib/utils";
import {
    addRule,
    areAllEmailIdsValid,
    buildQueryFromSearchData,
    createTemplateAndSendMail,
    removeRule,
    validateEmail,
} from "./helpers";
import MailRequestStatusModel, {
    MailRequestStatus,
} from "@models/MailRequestStatus";

const { permissions } = constants;

export async function createSubscription(
    name: string,
    email: string,
    ctx: GQLContext,
): Promise<boolean> {
    try {
        const sanitizedEmail = email.toLowerCase();
        let dbUser: User | null = await UserModel.findOne({
            email: sanitizedEmail,
            domain: ctx.subdomain._id,
        });

        if (!dbUser) {
            dbUser = await createUser({
                domain: ctx.subdomain!,
                name: name,
                email: sanitizedEmail,
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

// export async function createMail(
//     searchData: SearchData = {},
//     ctx: GQLContext,
// ): Promise<Mail | null> {
//     checkIfAuthenticated(ctx);

//     if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
//         throw new Error(responses.action_not_allowed);
//     }

//     try {
//         let emails = [];
//         let emptySearchData = Object.keys(searchData).length === 0;
//         if (!emptySearchData) {
//             const matchingUsers = await getUsers({
//                 searchData,
//                 ctx,
//                 noPagination: true,
//                 hasMailPermissions: true,
//             });
//             emails = matchingUsers.map((x) => x.email);
//         }
//         const mail = await MailModel.create({
//             domain: ctx.subdomain._id,
//             creatorId: ctx.user.userId,
//             to: emails,
//         });

//         return mail;
//     } catch (e: any) {
//         error(e.message, {
//             stack: e.stack,
//         });
//         throw e;
//     }
// }

export async function createSequence(
    ctx: GQLContext,
    type: (typeof Constants.mailTypes)[number],
): Promise<(Sequence & { creatorId: string }) | null> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    try {
        const emailId = generateUniqueId();
        const sequenceObj: Partial<AdminSequence> = {
            domain: ctx.subdomain._id,
            type,
            status: Constants.sequenceStatus[0],
            title: internal.default_email_sequence_name,
            creatorId: ctx.user.userId,
            emails: [
                {
                    emailId,
                    content: internal.default_email_content,
                    subject:
                        type === "broadcast"
                            ? internal.default_email_broadcast_subject
                            : internal.default_email_sequence_subject,
                    delayInMillis: 0,
                    published: false,
                },
            ],
            trigger: {
                type:
                    type === "broadcast"
                        ? Constants.eventTypes[4]
                        : Constants.eventTypes[2],
            },
            emailsOrder: [emailId],
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

// export async function createBroadcast(
//     ctx: GQLContext,
// ): Promise<(Sequence & { creatorId: string }) | null> {
//     checkIfAuthenticated(ctx);

//     if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
//         throw new Error(responses.action_not_allowed);
//     }

//     try {
//         const sequenceObj: Partial<AdminSequence> = {
//             domain: ctx.subdomain._id,
//             type: <SequenceType>Constants.mailTypes[0],
//             title: " ",
//             creatorId: ctx.user.userId,
//             emails: [
//                 {
//                     templateId: "123",
//                     content: " ",
//                     subject: " ",
//                     delayInMillis: 0,
//                     published: false,
//                 },
//             ],
//         };
//         const sequence = await SequenceModel.create(sequenceObj);
//         return sequence;
//     } catch (e: any) {
//         error(e.message, {
//             stack: e.stack,
//         });
//         throw e;
//     }
// }

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

export async function updateMail({
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
        sequence.filter = JSON.parse(filter);
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

export async function updateSequence({
    ctx,
    sequenceId,
    title,
    fromName,
    fromEmail,
    triggerType,
    triggerData,
    filter,
    emailsOrder,
}: {
    ctx: GQLContext;
    sequenceId: string;
    filter?: string;
    title?: string;
    fromEmail?: string;
    fromName?: string;
    triggerType?: (typeof Constants.eventTypes)[number];
    triggerData?: string;
    emailsOrder?: string[];
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

    if (emailsOrder) {
        if (
            sequence.emails.length !== emailsOrder.length ||
            !areAllEmailIdsValid(emailsOrder, sequence.emails)
        ) {
            throw new Error(responses.invalid_emails_order);
        }
        sequence.emailsOrder = emailsOrder;
    }

    if (filter) {
        sequence.filter = JSON.parse(filter);
    }
    if (title) {
        sequence.title = title;
        // if (sequence.type === "broadcast") {
        //     sequence.emails[0].subject = title;
        // }
    }
    if (fromEmail) {
        if (!sequence.from) {
            sequence.from = {
                name: "",
            };
        }
        sequence.from.email = fromName;
    }
    if (fromName) {
        if (!sequence.from) {
            sequence.from = {
                name: "",
            };
        }
        sequence.from.name = fromName;
    }
    if (triggerType) {
        if (!sequence.trigger) {
            sequence.trigger = {
                type: triggerType,
            };
        }
        sequence.trigger.type = triggerType;
    }
    if (triggerData) {
        if (!sequence.trigger) {
            sequence.trigger = {
                type: Constants.eventTypes[2],
            };
        }
        sequence.trigger.data = triggerData;
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
    type: (typeof Constants.mailTypes)[number];
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

export async function getMailRequestStatus(
    ctx: GQLContext,
): Promise<MailRequestStatus | undefined> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    return await MailRequestStatusModel.findOne({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
    });
}

export async function updateMailRequest(ctx: GQLContext, reason: string) {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    let mailRequestStatus = await MailRequestStatusModel.findOne({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
    });

    if (mailRequestStatus) {
        mailRequestStatus.reason = reason;
        await mailRequestStatus.save();
    } else {
        mailRequestStatus = await MailRequestStatusModel.create({
            domain: ctx.subdomain._id,
            userId: ctx.user.userId,
            reason,
        });
    }

    return mailRequestStatus;
}

const broadcastPublished = (sequence: AdminSequence): boolean =>
    sequence.type === "broadcast" &&
    [Constants.sequenceStatus[1], Constants.sequenceStatus[3]].includes(
        sequence.status as
            | (typeof Constants.sequenceStatus)[1]
            | (typeof Constants.sequenceStatus)[3],
    );

// export async function toggleEmailPublishStatus({
//     ctx,
//     sequenceId,
//     emailId,
// }: {
//     ctx: GQLContext;
//     sequenceId: string;
//     emailId: string;
// }): Promise<boolean> {
//     checkIfAuthenticated(ctx);

//     if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
//         throw new Error(responses.action_not_allowed);
//     }

//     const sequence = await SequenceModel.findOne({
//         domain: ctx.subdomain._id,
//         sequenceId,
//     });
//     if (!sequence) {
//         return false;
//     }

//     const email = sequence.emails.find(
//         (email: Email) => email.emailId === emailId,
//     );
//     if (!email) {
//         return false;
//     }

//     if (sequence.type === "broadcast" && sequence.report?.broadcast?.lockedAt) {
//         return false;
//     }

//     if (email.delayInMillis && email.delayInMillis < new Date().getTime()) {
//         throw new Error(responses.past_date);
//     }

//     email.published = !email.published;

//     await sequence.save();

//     if (sequence.type === "broadcast") {
//         if (email.published) {
//             if (email.delayInMillis) {
//                 await addRuleToSendLater({ sequence, ctx });
//             } else {
//                 await Promise.all([
//                     addBroadcastToOngoingSequence({ sequence, ctx }),
//                     (async () => {
//                         sequence.report = {
//                             broadcast: {
//                                 lockedAt: new Date(),
//                             },
//                         };
//                         await (sequence as any).save();
//                     })(),
//                 ]);
//             }
//         } else {
//             await removeRuleToSendLater({ sequence, ctx });
//         }
//     }

//     return sequence;
// }

export async function startSequence({
    ctx,
    sequenceId,
}: {
    ctx: GQLContext;
    sequenceId: string;
}): Promise<Sequence> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const sequence = await SequenceModel.findOne<Sequence>({
        domain: ctx.subdomain._id,
        sequenceId,
    });
    if (!sequence) {
        throw new Error(responses.item_not_found);
    }

    if (
        ![Constants.sequenceStatus[0], Constants.sequenceStatus[2]].includes(
            sequence.status as "draft" | "paused",
        )
    ) {
        throw new Error(responses.sequence_already_started);
    }

    if (!sequence.emails.some((email) => email.published)) {
        throw new Error(responses.no_published_emails);
    }

    if (sequence.type === "sequence") {
        if (!sequence.title || !sequence.trigger || !sequence.from?.name) {
            throw new Error(`${responses.sequence_details_missing}: basics`);
        }
        if (
            [
                Constants.eventTypes[0],
                Constants.eventTypes[1],
                Constants.eventTypes[2],
            ].includes(
                sequence.trigger.type as
                    | (typeof Constants.eventTypes)[0]
                    | (typeof Constants.eventTypes)[1]
                    | (typeof Constants.eventTypes)[2],
            ) &&
            !sequence.trigger?.data
        ) {
            throw new Error(`${responses.sequence_details_missing}: trigger`);
        }
    }

    if (sequence.type === "broadcast") {
        if (!sequence.filter) {
            throw new Error(`${responses.sequence_details_missing}: filter`);
        }
    }

    await addRule({ sequence, ctx });

    sequence.status = Constants.sequenceStatus[1];
    await (sequence as any).save();

    return sequence;
}

export async function pauseSequence({
    ctx,
    sequenceId,
}: {
    ctx: GQLContext;
    sequenceId: string;
}): Promise<Sequence> {
    const sequence = await SequenceModel.findOne({
        domain: ctx.subdomain._id,
        sequenceId,
    });

    if (!sequence) {
        throw new Error(responses.item_not_found);
    }

    if (sequence.status !== Constants.sequenceStatus[1]) {
        throw new Error(responses.sequence_not_active);
    }

    if (
        sequence.type === "broadcast" &&
        (sequence.report?.broadcast?.lockedAt ||
            !isDateInFuture(sequence.emails[0].delayInMillis))
    ) {
        throw new Error(responses.mail_already_sent);
    }

    await removeRule({ sequence, ctx });
    sequence.status = Constants.sequenceStatus[2];
    await (sequence as any).save();

    return sequence;
}

// async function addBroadcastToOngoingSequence({
//     sequence,
//     ctx,
// }: {
//     sequence: Sequence;
//     ctx: GQLContext;
// }) {
//     const allUsers = await getUsers({
//         searchData: {
//             filters: JSON.stringify(sequence.filter),
//         },
//         ctx,
//         noPagination: true,
//         hasMailPermissions: true,
//     });
//     const ongoingSequences = allUsers.map((user) => ({
//         domain: ctx.subdomain._id,
//         sequenceId: sequence.sequenceId,
//         userId: user.userId,
//         nextEmailId: sequence.emails[0].emailId,
//         nextEmailScheduledTime: new Date().getTime(),
//     }));
//     await OngoingSequence.insertMany(ongoingSequences);
// }

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

// export async function updateMail(
//     mailData: Pick<Mail, "mailId" | "to" | "subject" | "body"> = {},
//     ctx: GQLContext,
// ): Promise<Mail | null> {
//     checkIfAuthenticated(ctx);

//     let mail: Mail | null = await MailModel.findOne({
//         mailId: mailData.mailId,
//         domain: ctx.subdomain._id,
//     });

//     if (!isNotUndefined(mail)) {
//         throw new Error(responses.item_not_found);
//     }

//     if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
//         throw new Error(responses.action_not_allowed);
//     }

//     if (
//         mailData.subject &&
//         mailData.subject.length > UIConstants.MAIL_SUBJECT_MAX_LENGTH
//     ) {
//         throw new Error(responses.mail_subject_length_exceeded);
//     }

//     if (mailData.to) {
//         mailData.to = removeEmptyMembers(Array.from(new Set(mailData.to)));
//     }

//     if (mailData.to && mailData.to.length > UIConstants.MAIL_MAX_RECIPIENTS) {
//         throw new Error(responses.mail_max_recipients_exceeded);
//     }

//     try {
//         for (const key of Object.keys(mailData)) {
//             if (key === "mailId") continue;

//             mail[key] = mailData[key];
//         }

//         mail = await (mail as any).save();

//         return mail;
//     } catch (e: any) {
//         error(e.message, {
//             stack: e.stack,
//         });
//         return null;
//     }
// }

// const removeEmptyMembers = (arr: string[]) =>
//     arr.filter((x) => x.trim() !== "");

// function isNotUndefined(mail: Mail | null): mail is Mail {
//     return !!mail;
// }

// export async function sendMail(mailId: string, ctx: GQLContext): Promise<Mail> {
//     checkIfAuthenticated(ctx);

//     let mail: Mail | null = await MailModel.findOne({
//         mailId: mailId,
//         domain: ctx.subdomain._id,
//     });

//     if (!isNotUndefined(mail)) {
//         throw new Error(responses.item_not_found);
//     }

//     if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
//         throw new Error(responses.action_not_allowed);
//     }

//     if (mail.published) {
//         throw new Error(responses.mail_already_sent);
//     }

//     if (!mail.to || !mail.subject || !mail.body) {
//         throw new Error(responses.invalid_mail);
//     }

//     const from = `${ctx.subdomain.settings.title || ctx.subdomain.name} ${
//         ctx.user.email
//     }`;

//     await send({
//         from,
//         to: mail.to,
//         subject: mail.subject,
//         body: mail.body,
//     });

//     mail.published = true;
//     try {
//         await (mail as any).save();

//         return mail;
//     } catch (e: any) {
//         error(e.message, {
//             stack: e.stack,
//         });
//         throw new Error(responses.internal_error);
//     }
// }

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

export async function deleteMailFromSequence({
    ctx,
    sequenceId,
    emailId,
}: {
    ctx: GQLContext;
    sequenceId: string;
    emailId: string;
}): Promise<AdminSequence | null> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const sequence: AdminSequence = await SequenceModel.findOne({
        sequenceId,
        domain: ctx.subdomain._id,
    });

    if (sequence.type === "broadcast") {
        throw new Error(responses.action_not_allowed);
    }

    if (sequence.emails.length === 1) {
        throw new Error(responses.cannot_delete_last_email);
    }

    sequence.emails = sequence.emails.filter(
        (email) => email.emailId !== emailId,
    );
    sequence.emailsOrder = sequence.emailsOrder.filter(
        (emailId) => emailId !== emailId,
    );

    await (sequence as any).save();

    return sequence;
}

export async function addMailToSequence(
    ctx: GQLContext,
    sequenceId: string,
): Promise<AdminSequence | null> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const sequence: AdminSequence = await SequenceModel.findOne({
        sequenceId,
        domain: ctx.subdomain._id,
    });

    if (sequence.type === "broadcast") {
        throw new Error(responses.action_not_allowed);
    }

    // const lastEmail = sequence.emails.find(
    //     (email) =>
    //         email.emailId ===
    //         sequence.emailsOrder[sequence.emailsOrder.length - 1],
    // );

    const emailId = generateUniqueId();
    const oneDayInMillis =
        +process.env.SEQUENCE_DELAY_BETWEEN_MAILS || 86400000;
    const email = {
        emailId,
        content: internal.default_email_content,
        subject: internal.default_email_sequence_subject,
        delayInMillis: oneDayInMillis,
    };

    sequence.emails.push(email);
    sequence.emailsOrder.push(emailId);

    await (sequence as any).save();

    return sequence;
}

export async function updateMailInSequence({
    ctx,
    sequenceId,
    emailId,
    subject,
    content,
    previewText,
    delayInMillis,
    actionType,
    actionData,
    templateId,
    published,
}: {
    ctx: GQLContext;
    sequenceId: string;
    emailId: string;
    subject?: string;
    content?: string;
    previewText?: string;
    delayInMillis?: number;
    actionType?: (typeof Constants.emailActionTypes)[number];
    actionData?: Record<string, unknown>;
    templateId?: string;
    published?: boolean;
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

    const email = sequence.emails.find(
        (email: Email) => email.emailId === emailId,
    );

    if (subject) {
        email.subject = subject;
    }
    if (content) {
        email.content = content;
    }
    if (previewText) {
        email.previewText = previewText;
    }
    if (typeof delayInMillis === "number") {
        email.delayInMillis = delayInMillis;
    }
    if (templateId) {
        email.templateId = templateId;
    }
    if (typeof published === "boolean") {
        email.published = published;
    }
    if (actionType) {
        if (!email.action) {
            email.action = {};
        }
        email.action.type = actionType;
    }
    if (actionData) {
        if (!email.action) {
            email.action = {};
        }
        email.action.data = actionData;
    }

    validateEmail(email.content);

    await (sequence as any).save();

    return sequence;
}

export async function getSequences({
    ctx,
    type,
    offset = 1,
    itemsPerPage,
}: {
    ctx: GQLContext;
    type: (typeof Constants.mailTypes)[number];
    offset: number;
    itemsPerPage?: number;
}): Promise<AdminSequence | null> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    if ((itemsPerPage && itemsPerPage < 1) || offset < 1) {
        throw new Error(responses.invalid_input);
    }

    const PaginatedSequenceModel = makeModelTextSearchable(SequenceModel);
    const query = {
        domain: ctx.subdomain._id,
        type,
    };
    const sequences = await PaginatedSequenceModel(
        {
            query,
            offset,
            graphQLContext: ctx,
        },
        {
            itemsPerPage: itemsPerPage || constants.itemsPerPage,
            sortByColumn: "updatedAt",
            sortOrder: -1,
        },
    );

    return sequences;
}
