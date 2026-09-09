import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createUniversity, listUniversities } from "../controllers/adminController.js";

const router = Router();

// All admin routes require admin wallet
router.use(requireAuth, requireRole("admin"));

router.post("/universities", createUniversity);
router.get("/universities", listUniversities);

export default router;
