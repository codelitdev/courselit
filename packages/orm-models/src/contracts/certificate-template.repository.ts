import { Repository } from "../core/repository";
import { InternalCertificateTemplate } from "../models/certificate-template";

export interface CertificateTemplateRepository
    extends Repository<InternalCertificateTemplate> {
    findByTemplateId(
        templateId: string,
        domainId: string,
    ): Promise<InternalCertificateTemplate | null>;
    findByCourseId(
        courseId: string,
        domainId: string,
    ): Promise<InternalCertificateTemplate | null>;
    upsertForCourse(
        courseId: string,
        domainId: string,
        data: Partial<InternalCertificateTemplate>,
    ): Promise<InternalCertificateTemplate>;
}
