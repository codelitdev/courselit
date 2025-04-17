import { sequenceBounceLimit } from "../constants";
import OngoingSequenceModel, {
    OngoingSequence,
} from "./model/ongoing-sequence";
import SequenceModel from "./model/sequence";
import MembershipModel from "./model/membership";
import UserModel from "./model/user";
import RuleModel from "./model/rule";
import mongoose from "mongoose";
import DomainModel from "./model/domain";
import { Constants, EmailTemplate } from "@courselit/common-models";
import emailTemplate from "./model/email-template";
import {
    AdminSequence,
    InternalMembership,
    InternalUser,
} from "@courselit/common-logic";

export async function getDueOngoingSequences(): Promise<OngoingSequence[]> {
    const currentTime = new Date().getTime();

    return await OngoingSequenceModel.find({
        nextEmailScheduledTime: { $lt: currentTime },
        retryCount: { $lt: sequenceBounceLimit },
    });
}

export async function getSequence(
    sequenceId: string,
): Promise<AdminSequence | null> {
    // @ts-ignore - Mongoose type compatibility issue
    return await SequenceModel.findOne({
        sequenceId,
    });
}

export async function getUser(userId: string): Promise<InternalUser | null> {
    // @ts-ignore - Mongoose type compatibility issue
    return await UserModel.findOne({
        userId,
        active: true,
        subscribedToUpdates: true,
    }).lean<InternalUser | null>();
}

export async function deleteOngoingSequence(sequenceId: string): Promise<any> {
    await OngoingSequenceModel.deleteOne({ sequenceId });
}

export async function removeRuleForBroadcast(sequenceId: string) {
    await RuleModel.deleteOne({
        event: Constants.EventType.DATE_OCCURRED,
        "data.sequenceId": sequenceId,
    });
}

export async function updateSequenceSentAt(sequenceId: string): Promise<any> {
    // @ts-ignore - Mongoose type compatibility issue
    await SequenceModel.updateOne(
        { sequenceId },
        { $set: { "report.broadcast.sentAt": new Date() } },
    );
}

export async function getDomain(id: mongoose.Schema.Types.ObjectId) {
    // @ts-ignore - Mongoose type compatibility issue
    return await DomainModel.findById(id);
}

export async function getTemplate(id: string): Promise<EmailTemplate | null> {
    // @ts-ignore - Mongoose type compatibility issue
    return (await emailTemplate.find({ templateId: id }).lean()) as any;
}

export async function getMemberships(entityId: string, entityType: string) {
    // @ts-ignore - Mongoose type compatibility issue
    return await MembershipModel.find<InternalMembership>({
        entityId,
        entityType,
        status: Constants.MembershipStatus.ACTIVE,
    });
}
