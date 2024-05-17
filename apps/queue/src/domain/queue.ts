import { Queue } from "bullmq";
import redis from "../redis";

const mailQueue = new Queue("mail", { connection: redis });

export default mailQueue;
