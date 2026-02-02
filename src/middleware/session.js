import crypto from "node:crypto";
import valkey from "../utils/valkeyClient.js";

const sessionTTLSeconds = 30*60; // 30 minutes

export async function sessionMiddleware(req, res, next) {
    try{
        let sessionId = req.headers['x-session-id'];
        /*
        - Generate session if missing
        */
        if(!sessionId) {
            sessionId = crypto.randomUUID();
        }

        const sessionKey = `session:${sessionId}`;

        /*
        - Create or refresh session TTL
        */
        
        const exists = await valkey.exists(sessionKey);

        if(!exists) {
            await valkey.set(sessionKey, "1", {
                EX: sessionTTLSeconds
            })
        } else{
            await valkey.expire(sessionKey, sessionTTLSeconds);
        }

        /*
        - Attach to req and res
        */
        req.sessionId = sessionId;
        res.setHeader("x-session-id", sessionId);

        next();
    } catch (err) {
        next(err);
    }
}