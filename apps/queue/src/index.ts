import { connectToDatabase } from "./db";
import { processOngoingSequences } from "./domain/mail/process-ongoing-sequences";
import { processRules } from "./domain/mail/process-rules";

(async () => {
    await connectToDatabase();

    processOngoingSequences();
    processRules();
})();
