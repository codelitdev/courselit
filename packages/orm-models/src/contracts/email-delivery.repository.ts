import { Repository } from "../core/repository";
import { InternalEmailDelivery } from "../models/email-delivery";

export interface EmailDeliveryRepository
    extends Repository<InternalEmailDelivery> {
    findBySequenceAndEmail(
        sequenceId: string,
        emailId: string,
        userId: string,
        domainId: string,
    ): Promise<InternalEmailDelivery | null>;
}
