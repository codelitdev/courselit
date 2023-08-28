export default class HttpError extends Error {
    constructor(
        public message: string,
        public statusCode = 500,
    ) {
        super(message);
        this.name = "HttpError";
        this.statusCode = statusCode;
    }
}
