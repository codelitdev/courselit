import RuleModel from "@models/Rule";
import { Course, Email, Rule, Sequence, User } from "@courselit/common-models";
import GQLContext from "@models/GQLContext";
import mongoose from "mongoose";
import SearchData from "./models/search-data";
import DownloadLinkModel from "@models/DownloadLink";
import pug from "pug";
import digitalDownloadTemplate from "../../templates/download-link";
import { send } from "../../services/mail";
import { responses } from "@config/strings";
import { generateEmailFrom } from "@/lib/utils";

export function areAllEmailIdsValid(
    emailsOrder: string[],
    emails: Partial<Email>[],
) {
    return emailsOrder.every((emailId) =>
        emails.some((email) => email.emailId === emailId),
    );
}

export async function addRule({
    sequence,
    ctx,
}: {
    sequence: Sequence;
    ctx: GQLContext;
}) {
    const rule: Partial<Rule> & { domain: mongoose.Types.ObjectId } = {
        domain: ctx.subdomain._id,
        event: sequence.trigger.type,
        sequenceId: sequence.sequenceId,
    };

    if (sequence.type === "broadcast") {
        rule.eventDateInMillis = sequence.emails[0].delayInMillis;
    } else {
        rule.eventData = sequence.trigger.data;
    }

    await RuleModel.create(rule);
}

export async function removeRule({
    sequence,
    ctx,
}: {
    sequence: Sequence;
    ctx: GQLContext;
}) {
    await RuleModel.deleteMany({
        domain: ctx.subdomain._id,
        // event: sequence.trigger.type,
        sequenceId: sequence.sequenceId,
    });
}

export const buildQueryFromSearchData = (
    domain: mongoose.Types.ObjectId,
    searchData: SearchData = {},
    creatorId?: string,
) => {
    const query: Record<string, unknown> = { domain };
    // if (searchData.creatorId) {
    //     query.creatorId = searchData.creatorId;
    // }
    if (searchData.searchText) query.$text = { $search: searchData.searchText };

    return query;
};

export async function createTemplateAndSendMail({
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
        hideCourseLitBranding: ctx.subdomain.settings?.hideCourseLitBranding,
    });

    await send({
        to: [user.email],
        subject: `Thank you for signing up for ${course.title}`,
        body: emailBody,
        from: generateEmailFrom({
            name: ctx.subdomain?.settings?.title || ctx.subdomain.name,
            email: process.env.EMAIL_FROM || ctx.subdomain.email,
        }),
    });
}

export function validateEmail(emailContent: string, templateContent?: string) {
    const unsubscribeRegex = /{{\s*unsubscribe_link\s*}}/;
    const addressRegex = /{{\s*address\s*}}/;
    if (
        !unsubscribeRegex.test(emailContent) ||
        !addressRegex.test(emailContent)
    ) {
        throw new Error(responses.mandatory_tags_missing);
    }

    if (
        templateContent &&
        (!unsubscribeRegex.test(templateContent) ||
            !addressRegex.test(templateContent))
    ) {
        throw new Error(responses.mandatory_tags_missing);
    }
}
