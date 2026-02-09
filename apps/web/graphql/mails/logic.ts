import constants from "@config/constants";
import GQLContext from "@models/GQLContext";
import UserModel from "@courselit/orm-models/dao/user";
import { error } from "../../services/logger";
import { createUser, getMembership } from "../users/logic";
import {
    checkIfAuthenticated,
    makeModelTextSearchable,
} from "../../lib/graphql";
import { responses, internal } from "../../config/strings";
import { checkPermission, generateUniqueId } from "@courselit/utils";
import { Constants, Email, Sequence } from "@courselit/common-models";
import type { Event as SequenceEvent } from "@courselit/common-models";
import CourseModel from "@courselit/orm-models/dao/course";
import SequenceModel from "@courselit/orm-models/dao/sequence";
import {
    addRule,
    areAllEmailIdsValid,
    createTemplateAndSendMail,
    removeRule,
    verifyMandatoryTags,
} from "./helpers";
import MailRequestStatusModel, {
    MailRequestStatus,
} from "@courselit/orm-models/dao/mail-request-status";
import { getPlans } from "../paymentplans/logic";
import { activateMembership } from "@/app/api/payment/helpers";
import { AdminSequence, InternalCourse } from "@courselit/common-logic";
import { User } from "@courselit/common-models";
import EmailDeliveryModel from "@courselit/orm-models/dao/email-delivery";
import EmailEventModel from "@courselit/orm-models/dao/email-event";
import { defaultEmail } from "./default-email";

const { permissions } = constants;

const isDateInFuture = (timestamp?: number) =>
    typeof timestamp === "number" && timestamp > Date.now();

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

const defaultEmailContent = {
    ...defaultEmail,
    content: [
        {
            blockType: "text",
            settings: {
                content: "# Your Company Name\n\nThis is some paragraph text.",
                alignment: "left",
                fontSize: "24px",
            },
        },
        {
            blockType: "text",
            settings: {
                content: "{{address}}\n\n[Unsubscribe]({{unsubscribe_link}})",
                alignment: "center",
                fontSize: "12px",
                foregroundColor: "#64748b",
                paddingTop: "0px",
                paddingBottom: "0px",
            },
        },
    ],
};

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
                    content: defaultEmailContent,
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
                        ? Constants.EventType.DATE_OCCURRED
                        : Constants.EventType.PRODUCT_PURCHASED,
            },
            emailsOrder: [emailId],
            filter: {
                aggregator: "or",
                filters: [],
            },
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

type SequenceWithEntrantsCount = Omit<AdminSequence, "entrants"> & {
    entrantsCount: number;
};
export async function getSequence(
    ctx: GQLContext,
    sequenceId: string,
): Promise<SequenceWithEntrantsCount | null> {
    checkIfAuthenticated(ctx);

    const sequence = (await SequenceModel.findOne({
        sequenceId,
        domain: ctx.subdomain._id,
    }).lean()) as SequenceWithEntrantsCount | null;

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const result = Object.assign({}, sequence, {
        entrantsCount: (sequence as any)?.entrants?.length || 0,
    });

    return result;
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

    const sequence: AdminSequence | null = await SequenceModel.findOne({
        sequenceId,
        domain: ctx.subdomain._id,
    });

    if (!sequence) {
        return null;
    }

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
    const firstEmail = sequence.emails[0] as Email & { templateId?: string };
    if (templateId) {
        firstEmail.templateId = templateId;
    }
    if (content) {
        firstEmail.content = JSON.parse(content);
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
    triggerType?: SequenceEvent;
    triggerData?: string;
    emailsOrder?: string[];
}): Promise<AdminSequence | null> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const sequence: AdminSequence | null = await SequenceModel.findOne({
        sequenceId,
        domain: ctx.subdomain._id,
    });

    if (!sequence) {
        return null;
    }

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
    } else {
        sequence.filter = {
            aggregator: "or",
            filters: [],
        };
    }
    if (title) {
        sequence.title = title;
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
            } as unknown as Sequence["trigger"];
        }
        sequence.trigger.type =
            triggerType as unknown as Sequence["trigger"]["type"];
    }
    if (triggerData) {
        if (!sequence.trigger) {
            sequence.trigger = {
                type: Constants.EventType.PRODUCT_PURCHASED,
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
                    type: Constants.mailTypes[0] as Sequence["type"],
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

    const status = await MailRequestStatusModel.findOne({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
    });

    return status ?? undefined;
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
                Constants.EventType.TAG_ADDED,
                Constants.EventType.TAG_REMOVED,
                Constants.EventType.PRODUCT_PURCHASED,
            ].includes(sequence.trigger.type as any) &&
            !sequence.trigger?.data
        ) {
            throw new Error(`${responses.sequence_details_missing}: trigger`);
        }
    }

    if (sequence.type === "broadcast") {
        if (!sequence.filter || sequence.filter?.filters?.length === 0) {
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

export async function sendCourseOverMail(
    courseId: string,
    email: string,
    ctx: GQLContext,
): Promise<boolean> {
    const course = (await CourseModel.findOne({
        courseId,
        domain: ctx.subdomain._id,
        published: true,
        leadMagnet: true,
    }).lean()) as unknown as InternalCourse;

    if (!course) {
        throw new Error(responses.item_not_found);
    }

    const paymentPlans = await getPlans({
        entityId: course.courseId,
        entityType: Constants.MembershipEntityType.COURSE,
        ctx,
    });

    if (
        paymentPlans.length !== 1 ||
        paymentPlans[0].type !== Constants.PaymentPlanType.FREE
    ) {
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
            subscribedToUpdates: true,
        });
    }

    const membership = await getMembership({
        domainId: ctx.subdomain._id,
        userId: dbUser!.userId,
        entityType: Constants.MembershipEntityType.COURSE,
        entityId: course.courseId,
        planId: paymentPlans[0].planId,
    });

    await activateMembership(ctx.subdomain!, membership, paymentPlans[0]);

    if (course.lessons.length === 0) {
        return true;
    }

    await createTemplateAndSendMail({ course, ctx, user: dbUser! });
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

    const sequence = (await SequenceModel.findOne({
        sequenceId,
        domain: ctx.subdomain._id,
    })) as AdminSequence | null;

    if (!sequence) {
        throw new Error(responses.item_not_found);
    }

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
        (existingEmailId) => existingEmailId !== emailId,
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

    const sequence = (await SequenceModel.findOne({
        sequenceId,
        domain: ctx.subdomain._id,
    })) as AdminSequence | null;

    if (!sequence) {
        throw new Error(responses.item_not_found);
    }

    if (sequence.type === "broadcast") {
        throw new Error(responses.action_not_allowed);
    }

    // const lastEmail = sequence.emails.find(
    //     (email) =>
    //         email.emailId ===
    //         sequence.emailsOrder[sequence.emailsOrder.length - 1],
    // );

    const emailId = generateUniqueId();
    const oneDayInMillis = +(
        process.env.SEQUENCE_DELAY_BETWEEN_MAILS || 86400000
    );
    const email = {
        emailId,
        content: defaultEmailContent,
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
    // previewText,
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
    // previewText?: string;
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

    const sequence: AdminSequence | null = await SequenceModel.findOne({
        sequenceId,
        domain: ctx.subdomain._id,
    });

    if (!sequence) {
        return null;
    }

    if (broadcastPublished(sequence)) {
        return sequence;
    }

    const email = sequence.emails.find(
        (email: Email) => email.emailId === emailId,
    );

    if (!email) {
        throw new Error(responses.item_not_found);
    }

    if (subject) {
        email.subject = subject;
    }
    if (content) {
        email.content = JSON.parse(content);
    }
    if (typeof delayInMillis === "number") {
        email.delayInMillis = delayInMillis;
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

    verifyMandatoryTags(email.content?.content || []);

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
}): Promise<SequenceWithEntrantsCount[]> {
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

    return sequences.map((sequence) => ({
        ...sequence,
        entrantsCount: sequence.entrants?.length || 0,
    }));
}

export async function getEmailSentCount({
    ctx,
    sequenceId,
}: {
    ctx: GQLContext;
    sequenceId: string;
}): Promise<number> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const sequence = await SequenceModel.findOne({
        domain: ctx.subdomain._id,
        sequenceId,
    });

    if (!sequence) {
        throw new Error(responses.item_not_found);
    }

    const emailCount = await EmailDeliveryModel.countDocuments({
        domain: ctx.subdomain._id,
        sequenceId,
    });

    return emailCount;
}

export async function getSequenceOpenRate({
    ctx,
    sequenceId,
}: {
    ctx: GQLContext;
    sequenceId: string;
}): Promise<number> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const sequence = await SequenceModel.findOne({
        domain: ctx.subdomain._id,
        sequenceId,
    });

    if (!sequence) {
        throw new Error(responses.item_not_found);
    }

    const openEvents = await EmailEventModel.aggregate([
        {
            $match: {
                domain: ctx.subdomain._id,
                sequenceId,
                action: Constants.EmailEventAction.OPEN,
            },
        },
        {
            $group: {
                _id: {
                    // sequenceId: "$sequenceId",
                    userId: "$userId",
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const uniqueOpenersCount = openEvents.length;

    const uniqueRecipientsCount = await EmailDeliveryModel.distinct("userId", {
        domain: ctx.subdomain._id,
        sequenceId,
    });

    return (uniqueOpenersCount / uniqueRecipientsCount.length) * 100 || 0;
}

export async function getSequenceClickThroughRate({
    ctx,
    sequenceId,
}: {
    ctx: GQLContext;
    sequenceId: string;
}): Promise<number> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const sequence = await SequenceModel.findOne({
        domain: ctx.subdomain._id,
        sequenceId,
    });

    if (!sequence) {
        throw new Error(responses.item_not_found);
    }

    const clickEvents = await EmailEventModel.aggregate([
        {
            $match: {
                domain: ctx.subdomain._id,
                sequenceId,
                action: Constants.EmailEventAction.CLICK,
            },
        },
        {
            $group: {
                _id: {
                    userId: "$userId",
                },
                count: { $sum: 1 },
            },
        },
    ]);

    const uniqueClickerCount = clickEvents.length;

    const uniqueRecipientsCount = await EmailDeliveryModel.distinct("userId", {
        domain: ctx.subdomain._id,
        sequenceId,
    });

    return (uniqueClickerCount / uniqueRecipientsCount.length) * 100 || 0;
}

export async function getSubscribers({
    ctx,
    sequenceId,
    page = 1,
    limit = 10,
}: {
    ctx: GQLContext;
    sequenceId: string;
    page?: number;
    limit?: number;
}): Promise<User[]> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const sequence = await SequenceModel.findOne({
        domain: ctx.subdomain._id,
        sequenceId,
    });

    if (!sequence) {
        throw new Error(responses.item_not_found);
    }

    const skip = (page - 1) * limit;

    const subscribers = await UserModel.find({
        domain: ctx.subdomain._id,
        userId: { $in: sequence.entrants },
    })
        .skip(skip)
        .limit(limit);

    return subscribers;
}

export async function getSubscribersCount({
    ctx,
    sequenceId,
}: {
    ctx: GQLContext;
    sequenceId: string;
}): Promise<number> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const sequence = await SequenceModel.findOne({
        domain: ctx.subdomain._id,
        sequenceId,
    });

    if (!sequence) {
        throw new Error(responses.item_not_found);
    }

    const count = await UserModel.countDocuments({
        domain: ctx.subdomain._id,
        userId: { $in: sequence.entrants },
    });

    return count;
}
