import { Router } from "express";
import ragRoutes from "../../v1/components/rag/rag.route.js"

const router = Router();

router.use("/rag", ragRoutes);

export default router;