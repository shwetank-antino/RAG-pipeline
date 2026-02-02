import express from "express";
import cors from "cors";
import multer from "multer";
import { rateLimiter } from "./middleware/rate-limiter.js";
import allV1Routes from "./routes/v1/routes.js"
import { sessionMiddleware } from "./middleware/session.js";

const app = express();

app.use(rateLimiter);
app.use(sessionMiddleware);

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    } else if (err) {
        return res.status(500).json({ message: err.message });
    }
    next(err);
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
    return res.status(200).json({status: "All Working!"});
});

app.use("/v1", allV1Routes);

export default app;