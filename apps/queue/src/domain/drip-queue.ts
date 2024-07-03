import { Queue } from "bullmq";
import redis from "../redis";

const dripQueue = new Queue("drip", { connection: redis });

export default dripQueue;
