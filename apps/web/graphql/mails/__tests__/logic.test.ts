/**
 * @jest-environment node
 */

import DomainModel from "@/models/Domain";
import EmailTemplateModel from "@/models/EmailTemplate";
import constants from "@/config/constants";
import { responses } from "@/config/strings";
import GQLContext from "@/models/GQLContext";
import { defaultEmail } from "../default-email";
import {
    addMailToSequence,
    createEmailTemplate,
    createSequence,
    getEmailTemplates,
    getSystemEmailTemplates,
    updateEmailTemplate,
} from "../logic";
import SequenceModel from "@/models/Sequence";

const { permissions } = constants;

describe("createEmailTemplate", () => {
    let domain: any;
    let ctx: GQLContext;

    beforeAll(async () => {
        domain = await DomainModel.create({
            name: `mail-template-domain-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            email: "owner@example.com",
        });
    });

    beforeEach(async () => {
        ctx = {
            subdomain: domain,
            user: {
                userId: "admin-user",
                permissions: [permissions.manageUsers],
            },
            address: "https://example.com",
        } as unknown as GQLContext;

        await EmailTemplateModel.deleteMany({ domain: domain._id });
        await SequenceModel.deleteMany({ domain: domain._id });
    });

    afterAll(async () => {
        await EmailTemplateModel.deleteMany({ domain: domain._id });
        await SequenceModel.deleteMany({ domain: domain._id });
        await DomainModel.deleteMany({ _id: domain._id });
    });

    it("creates a unique title when the default title already exists", async () => {
        await EmailTemplateModel.create({
            domain: domain._id,
            templateId: "template-1",
            title: "Blank",
            creatorId: "existing-user",
            content: defaultEmail,
        });

        const template = await createEmailTemplate({
            templateId: "system-5",
            context: ctx,
        });

        expect(template.title).toBe("Blank 2");
    });

    it("fills the next available numeric suffix", async () => {
        await EmailTemplateModel.create([
            {
                domain: domain._id,
                templateId: "template-1",
                title: "Blank",
                creatorId: "existing-user",
                content: defaultEmail,
            },
            {
                domain: domain._id,
                templateId: "template-2",
                title: "Blank 2",
                creatorId: "existing-user",
                content: defaultEmail,
            },
        ]);

        const template = await createEmailTemplate({
            templateId: "system-5",
            context: ctx,
        });

        expect(template.title).toBe("Blank 3");
    });

    it("creates a template from selected starter content", async () => {
        await EmailTemplateModel.create({
            domain: domain._id,
            templateId: "template-starter-source",
            title: "Starter source",
            creatorId: "existing-user",
            content: defaultEmail,
        });

        const template = await createEmailTemplate({
            templateId: "template-starter-source",
            context: ctx,
        });

        expect(template.title).toBe("Starter source 2");
        expect(template.content?.meta?.previewText).toBe(
            defaultEmail.meta.previewText,
        );
    });

    it("shows a friendly error when renaming a template to an existing title", async () => {
        await EmailTemplateModel.create([
            {
                domain: domain._id,
                templateId: "template-1",
                title: "Welcome template",
                creatorId: "existing-user",
                content: defaultEmail,
            },
            {
                domain: domain._id,
                templateId: "template-2",
                title: "Follow up template",
                creatorId: "existing-user",
                content: defaultEmail,
            },
        ]);

        await expect(
            updateEmailTemplate({
                templateId: "template-2",
                title: "Welcome template",
                context: ctx,
            }),
        ).rejects.toThrow(responses.email_template_already_exists);
    });

    it("adds a new sequence email from a selected template id", async () => {
        await SequenceModel.create({
            domain: domain._id,
            sequenceId: "sequence-1",
            title: "Welcome flow",
            type: "sequence",
            from: {
                name: "Admin",
                email: "admin@example.com",
            },
            trigger: {
                type: "subscriber:added",
            },
            emails: [],
            emailsOrder: [],
            creatorId: "admin-user",
        });

        await EmailTemplateModel.create({
            domain: domain._id,
            templateId: "template-launch-1",
            title: "Launch email",
            creatorId: "admin-user",
            content: defaultEmail,
        });

        const sequence = await addMailToSequence(
            ctx,
            "sequence-1",
            "template-launch-1",
        );

        expect(sequence?.emails).toHaveLength(1);
        expect(sequence?.emails[0].subject).toBe("Launch email");
        expect(sequence?.emails[0].content?.meta?.previewText).toBe(
            defaultEmail.meta.previewText,
        );
    });

    it("returns templates in reverse chronological order", async () => {
        await EmailTemplateModel.create({
            domain: domain._id,
            templateId: "template-1",
            title: "Older template",
            creatorId: "existing-user",
            content: defaultEmail,
        });

        await EmailTemplateModel.create({
            domain: domain._id,
            templateId: "template-2",
            title: "Newer template",
            creatorId: "existing-user",
            content: defaultEmail,
        });

        const templates = await getEmailTemplates({ context: ctx });

        expect(templates.map((template) => template.title)).toEqual([
            "Newer template",
            "Older template",
        ]);
    });

    it("returns discovered system email templates", async () => {
        const templates = await getSystemEmailTemplates({ context: ctx });

        expect(templates.length).toBeGreaterThan(0);
        expect(
            templates.some((template) => template.templateId === "system-5"),
        ).toBe(true);
    });

    it("creates a sequence from a system template id", async () => {
        const sequence = await createSequence(ctx, "sequence", "system-5");

        expect(sequence?.title).toBe("Blank");
        expect(sequence?.emails[0].subject).toBe("Blank");
        expect(sequence?.emails[0].content).toMatchObject({
            meta: {
                previewText:
                    "A blank starter template with only content and unsubscribe placeholders.",
            },
        });
    });

    it("creates a sequence from a saved custom template id", async () => {
        await EmailTemplateModel.create({
            domain: domain._id,
            templateId: "template-custom-1",
            title: "Custom welcome",
            creatorId: "admin-user",
            content: defaultEmail,
        });

        const sequence = await createSequence(
            ctx,
            "broadcast",
            "template-custom-1",
        );

        expect(sequence?.title).toBe("Custom welcome");
        expect(sequence?.emails[0].subject).toBe("Custom welcome");
        expect(sequence?.emails[0].content?.meta?.previewText).toBe(
            defaultEmail.meta.previewText,
        );
    });
});
