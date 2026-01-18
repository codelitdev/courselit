import { Repository } from "../core/repository";
import { InternalCertificate } from "../models/certificate";

export interface CertificateRepository extends Repository<InternalCertificate> {
    findByCertificateId(
        certificateId: string,
        domainId: string,
    ): Promise<InternalCertificate | null>;
    findByUserAndCourse(
        userId: string,
        courseId: string,
        domainId: string,
    ): Promise<InternalCertificate | null>;
    findByCourse(
        courseId: string,
        domainId: string,
    ): Promise<InternalCertificate[]>;
    findByUser(
        userId: string,
        domainId: string,
    ): Promise<InternalCertificate[]>;
}
