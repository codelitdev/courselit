import { Queue } from "bullmq";
import redis from "../redis";

const sequenceQueue = new Queue("sequence", { connection: redis });

export default sequenceQueue;
