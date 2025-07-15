import { jwtUtils } from "@courselit/utils";
import { logger } from "../logger";

export const verifyJWTMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }

        const secret = process.env.COURSELIT_JWT_SECRET;
        const decoded: any = jwtUtils.verifyToken(token, secret);
        if (!decoded) {
            return res.status(401).json({ error: "Invalid token" });
        }

        req.user = decoded.user;
        next();
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ error: err.message });
    }
};
