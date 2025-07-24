import { Constants } from ".";

export type EmailEventAction =
    (typeof Constants.EmailEventAction)[keyof typeof Constants.EmailEventAction];
