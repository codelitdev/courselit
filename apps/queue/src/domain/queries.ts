import { sequenceBounceLimit } from "../constants";
import OngoingSequenceModel, {
    OngoingSequence,
} from "./model/ongoing-sequence";
import SequenceModel, { AdminSequence } from "./model/sequence";
import UserModel, { UserWithDomain } from "./model/user";
import RuleModel from "./model/rule";
import mongoose from "mongoose";
import DomainModel from "./model/domain";
import { Constants, EmailTemplate } from "@courselit/common-models";
import emailTemplate from "./model/email-template";

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
    return await SequenceModel.findOne({
        sequenceId,
    });
}

export async function getUser(userId: string): Promise<UserWithDomain | null> {
    return await UserModel.findOne({
        userId,
        active: true,
        subscribedToUpdates: true,
    }).lean<UserWithDomain | null>();
}

export async function deleteOngoingSequence(sequenceId: string): Promise<any> {
    await OngoingSequenceModel.deleteOne({ sequenceId });
}

export async function removeRuleForBroadcast(sequenceId: string) {
    await RuleModel.deleteOne({
        event: Constants.eventTypes[4],
        "data.sequenceId": sequenceId,
    });
}

export async function updateSequenceSentAt(sequenceId: string): Promise<any> {
    await SequenceModel.updateOne(
        { sequenceId },
        { $set: { "report.broadcast.sentAt": new Date() } },
    );
}

export async function getDomain(id: mongoose.Schema.Types.ObjectId) {
    return await DomainModel.findById(id);
}

export async function getTemplate(id: string): Promise<EmailTemplate | null> {
    return (await emailTemplate.find({ templateId: id }).lean()) as any;
}
