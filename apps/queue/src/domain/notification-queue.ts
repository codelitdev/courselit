import { Queue } from "bullmq";
import redis from "../redis";

const notificationQueue = new Queue("notification", {
    connection: redis,
});

export default notificationQueue;
