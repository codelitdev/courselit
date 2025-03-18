import { Constants } from ".";

export type Event =
    (typeof Constants.EventType)[keyof typeof Constants.EventType];
