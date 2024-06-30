import { Constants } from ".";
import { Email } from "./email";

export type DripType = (typeof Constants.dripType)[number];

export interface Drip {
    type: DripType;
    delayInMillis?: number;
    dateInUTC?: number;
    email?: Email;
}
