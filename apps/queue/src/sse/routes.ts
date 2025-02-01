import express from "express";
import { notificationEmitter } from "../domain/emitters/notification";

const router = express.Router();

router.get("/:userId", (req, res) => {
    const { userId } = req.params;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    const sendNotification = (notificationId: string) => {
        res.write(`data: ${JSON.stringify(notificationId)}\n\n`);
    };

    notificationEmitter.on("newNotification", (notification) => {
        if (notification.forUserId === userId) {
            sendNotification(notification.notificationId);
        }
    });

    req.on("close", () => {
        notificationEmitter.removeListener("newNotification", sendNotification);
        res.end();
    });
});

export default router;
