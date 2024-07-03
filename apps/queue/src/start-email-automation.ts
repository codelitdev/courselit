import { connectToDatabase } from "./db";
import { processDrip } from "./domain/process-drip";
import { processOngoingSequences } from "./domain/process-ongoing-sequences";
import { processRules } from "./domain/process-rules";

export async function startEmailAutomation() {
    await connectToDatabase();

    processOngoingSequences();
    processRules();
    processDrip();
}
