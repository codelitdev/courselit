import { Queue } from "bullmq";
import redis from "../redis";

const zapierQueue = new Queue("zapier", {
    connection: redis,
});

export default zapierQueue;
