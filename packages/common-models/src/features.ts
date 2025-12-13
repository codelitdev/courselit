import { Constants } from ".";

export type Features =
    (typeof Constants.Features)[keyof typeof Constants.Features];
