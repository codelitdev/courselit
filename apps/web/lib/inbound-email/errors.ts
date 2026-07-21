export type InboundEmailErrorKind =
    | "authentication"
    | "configuration"
    | "invalid"
    | "transient";

export class InboundEmailError extends Error {
    constructor(
        public readonly kind: InboundEmailErrorKind,
        message: string,
    ) {
        super(message);
        this.name = "InboundEmailError";
    }
}
