import { Constants } from ".";

export type Action = (typeof Constants.actionTypes)[number];
