import Log from "../models/Log";
import constants from "../config/constants";

const { severityError, severityInfo, severityWarn } = constants;

export const info = async (
    message: string,
    metadata?: Record<string, unknown>,
) => {
    if (process.env.NODE_ENV === "production") {
        await Log.create({
            severity: severityInfo,
            message,
            metadata,
        });
    } else {
        console.error(severityError, message, metadata);
    }
};

export const warn = async (
    message: string,
    metadata?: Record<string, unknown>,
) => {
    if (process.env.NODE_ENV === "production") {
        await Log.create({
            severity: severityWarn,
            message,
            metadata,
        });
    } else {
        console.error(severityError, message, metadata);
    }
};

export const error = async (
    message: string,
    metadata?: {
        fileName?: string;
        stack?: Record<string, unknown>;
        [x: string]: any;
    },
) => {
    if (process.env.NODE_ENV === "production") {
        await Log.create({
            severity: severityError,
            message,
            metadata,
        });
    } else {
        console.error(severityError, message, metadata);
    }
};
