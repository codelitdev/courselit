import { connectToDatabase } from "./db";
import { processOngoingSequences } from "./domain/mail/process-ongoing-sequences";
import { processRules } from "./domain/mail/process-rules";

export async function startEmailAutomation() {
    await connectToDatabase();

    processOngoingSequences();
    processRules();
}
