import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
    prepareUniversity,
    confirmUniversity,
    deletePendingUniversity,
    listUniversities,
} from "../controllers/adminController.js";

const router = Router();

// All admin routes require admin wallet
router.use(requireAuth, requireRole("admin"));

router.post("/universities/prepare", prepareUniversity);
router.post("/universities/confirm", confirmUniversity);
router.delete("/universities/:walletAddress", deletePendingUniversity);
router.get("/universities", listUniversities);

export default router;
