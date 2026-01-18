import { sequenceBounceLimit } from "../constants";
import { repositories } from "@courselit/orm-models";
import RuleModel from "./model/rule";
import SequenceModel from "./model/sequence";
import MembershipModel from "./model/membership";
import mongoose from "mongoose";
import { Constants, EmailTemplate } from "@courselit/common-models";
import emailTemplate from "./model/email-template";
import {
    AdminSequence,
    InternalMembership,
    InternalUser,
} from "@courselit/common-logic";
import { OngoingSequence } from "@courselit/common-models";
import { DomainDocument } from "./model/domain";

export async function getDueOngoingSequences(): Promise<OngoingSequence[]> {
    const currentTime = new Date().getTime();
    return await repositories.ongoingSequence.findDue(
        currentTime,
        sequenceBounceLimit,
    );
}

export async function getSequence(
    sequenceId: string,
    domainId: string,
): Promise<AdminSequence | null> {
    return (await repositories.sequence.findBySequenceId(
        sequenceId,
        domainId,
    )) as unknown as AdminSequence;
}

export async function getUser(
    userId: string,
    domainId: string,
): Promise<InternalUser | null> {
    return (await repositories.user.findByUserId(
        userId,
        domainId,
    )) as unknown as InternalUser;
}

export async function deleteOngoingSequence(id: string): Promise<any> {
    // Expects DB ID (ObjectId string)
    await repositories.ongoingSequence.delete(id);
}

export async function removeRuleForBroadcast(sequenceId: string) {
    await RuleModel.deleteOne({
        event: Constants.EventType.DATE_OCCURRED,
        "data.sequenceId": sequenceId,
    });
}

export async function updateSequenceSentAt(sequenceId: string): Promise<any> {
    await (SequenceModel as any).updateOne(
        { sequenceId },
        { $set: { "report.broadcast.sentAt": new Date() } },
    );
}

export async function getDomain(
    id: mongoose.Types.ObjectId,
): Promise<DomainDocument | null> {
    // @ts-ignore
    return (await repositories.domain.findById(
        id.toString(),
    )) as DomainDocument;
}

export async function getTemplate(id: string): Promise<EmailTemplate | null> {
    // @ts-ignore - Mongoose type compatibility issue
    return (await emailTemplate.find({ templateId: id }).lean()) as any;
}

export async function getMemberships(entityId: string, entityType: string) {
    // @ts-ignore - Mongoose type compatibility issue
    return await (MembershipModel as any).find({
        entityId,
        entityType,
        status: Constants.MembershipStatus.ACTIVE,
    });
}
