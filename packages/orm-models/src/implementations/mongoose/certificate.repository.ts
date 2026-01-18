import { MongooseRepository } from "./base.repository";
import { CertificateRepository } from "../../contracts/certificate.repository";
import { InternalCertificate } from "../../models/certificate";
import mongoose, { Model } from "mongoose";

export class MongooseCertificateRepository
    extends MongooseRepository<InternalCertificate, InternalCertificate>
    implements CertificateRepository
{
    constructor(model: Model<InternalCertificate>) {
        super(model);
    }

    protected toEntity(doc: InternalCertificate): InternalCertificate {
        return doc;
    }

    async findByCertificateId(
        certificateId: string,
        domainId: string,
    ): Promise<InternalCertificate | null> {
        return await this.model
            .findOne({ certificateId, domain: domainId })
            .lean();
    }

    async findByUserAndCourse(
        userId: string,
        courseId: string,
        domainId: string,
    ): Promise<InternalCertificate | null> {
        return await this.model
            .findOne({ userId, courseId, domain: domainId })
            .lean();
    }

    async findByCourse(
        courseId: string,
        domainId: string,
    ): Promise<InternalCertificate[]> {
        return await this.model.find({ courseId, domain: domainId }).lean();
    }

    async findByUser(
        userId: string,
        domainId: string,
    ): Promise<InternalCertificate[]> {
        return await this.model.find({ userId, domain: domainId }).lean();
    }
}
