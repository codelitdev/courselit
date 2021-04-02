class HttpError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

module.exports = HttpError;
