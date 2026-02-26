import { Queue } from "bullmq";
import redis from "../../redis";

const dispatchNotificationQueue = new Queue("dispatch-notification", {
    connection: redis,
});

export default dispatchNotificationQueue;
