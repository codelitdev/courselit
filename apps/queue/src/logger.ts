import pino from "pino";

const transport = pino.transport({
    target: "pino-mongodb",
    options: {
        uri: process.env.DB_CONNECTION_STRING,
        collection: "queue_logs",
    },
});

export const logger = pino(transport);
