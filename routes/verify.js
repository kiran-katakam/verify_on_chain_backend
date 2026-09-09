import { Router } from "express";
import { verifyCertificate } from "../controllers/verifyController.js";

const router = Router();

// Public endpoint — no authentication required
router.post("/", verifyCertificate);

export default router;
