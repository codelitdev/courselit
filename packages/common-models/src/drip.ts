import { Constants } from ".";
import { Email } from "./email";

export type DripType = (typeof Constants.dripType)[number];

export interface Drip {
    type: DripType;
    status: boolean;
    delayInMillis?: number;
    dateInUTC?: number;
    email?: Email;
}
