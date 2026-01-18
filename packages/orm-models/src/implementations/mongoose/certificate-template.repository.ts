import { MongooseRepository } from "./base.repository";
import { CertificateTemplateRepository } from "../../contracts/certificate-template.repository";
import { InternalCertificateTemplate } from "../../models/certificate-template";
import mongoose, { Model } from "mongoose";

export class MongooseCertificateTemplateRepository
    extends MongooseRepository<
        InternalCertificateTemplate,
        InternalCertificateTemplate
    >
    implements CertificateTemplateRepository
{
    constructor(model: Model<InternalCertificateTemplate>) {
        super(model);
    }

    protected toEntity(
        doc: InternalCertificateTemplate,
    ): InternalCertificateTemplate {
        return doc;
    }

    async findByTemplateId(
        templateId: string,
        domainId: string,
    ): Promise<InternalCertificateTemplate | null> {
        return await this.model
            .findOne({ templateId, domain: domainId })
            .lean();
    }

    async findByCourseId(
        courseId: string,
        domainId: string,
    ): Promise<InternalCertificateTemplate | null> {
        return await this.model
            .findOne({ courseId, domain: domainId })
            .sort({ createdAt: -1 })
            .lean();
    }

    async upsertForCourse(
        courseId: string,
        domainId: string,
        data: Partial<InternalCertificateTemplate>,
    ): Promise<InternalCertificateTemplate> {
        const doc = await this.model
            .findOneAndUpdate(
                { courseId, domain: domainId },
                { ...data },
                { upsert: true, new: true },
            )
            .lean();
        return doc as InternalCertificateTemplate;
    }
}
