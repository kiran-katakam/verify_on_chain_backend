import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
    prepareCertificate,
    confirmCertificate,
    listCertificates,
    deletePendingCertificate,
    prepareRevoke,
    confirmRevoke,
} from "../controllers/certificateController.js";

const router = Router();

router.post("/prepare", requireAuth, requireRole("university"), prepareCertificate);
router.post("/confirm", requireAuth, requireRole("university"), confirmCertificate);
router.get("/", requireAuth, requireRole("university"), listCertificates);

// Delete pending (unsigned) certificates
router.delete("/:fieldHash", requireAuth, requireRole("university"), deletePendingCertificate);

// Revocation
router.post("/:fieldHash/revoke/prepare", requireAuth, requireRole("university"), prepareRevoke);
router.post("/:fieldHash/revoke/confirm", requireAuth, requireRole("university"), confirmRevoke);

export default router;
