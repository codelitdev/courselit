export default {
    host: process.env.REDIS_HOST || "localhost",
    port: +(process.env.REDIS_PORT || 6379),
};
