import Certificate from "../models/Certificate.js";
import University from "../models/University.js";
import { computeFieldHash } from "../config/contract.js";

/**
 * POST /certificates/prepare
 * Validate fields, compute hash (with issuer address), save to DB as 'pending'.
 * Returns the fieldHash for the frontend to sign on-chain via MetaMask.
 */
export async function prepareCertificate(req, res) {
    try {
        const { firstName, lastName, dob, studentId, percentile } = req.body;

        if (!firstName || !lastName || !dob || !studentId || percentile === undefined) {
            return res.status(400).json({
                error: "Missing required fields: firstName, lastName, dob, studentId, percentile",
            });
        }

        const pct = Number(percentile);
        if (isNaN(pct) || pct < 0 || pct > 10000) {
            return res.status(400).json({
                error: "Percentile must be between 0 and 10000 (2 decimal places × 100)",
            });
        }

        const university = await University.findOne({
            walletAddress: req.user.walletAddress,
        });
        if (!university) {
            return res.status(404).json({ error: "University not found for this wallet" });
        }

        // Check studentId uniqueness within this university (non-pending)
        const existingCert = await Certificate.findOne({
            universityId: university._id,
            studentId: studentId,
            status: { $ne: "pending" },
        });
        if (existingCert) {
            return res.status(409).json({
                error: `Student ID '${studentId}' already has an issued/revoked certificate`,
            });
        }

        // Delete any existing pending cert for this studentId at this university
        await Certificate.deleteMany({
            universityId: university._id,
            studentId: studentId,
            status: "pending",
        });

        // Compute the keccak256 hash (includes issuer address)
        const fields = { firstName, lastName, dob, studentId, percentile: pct };
        const fieldHash = computeFieldHash(fields, university.walletAddress);

        // Save to MongoDB as pending
        await Certificate.create({
            universityId: university._id,
            studentId,
            fieldHash,
            status: "pending",
        });

        res.status(201).json({
            fieldHash,
            message: "Certificate prepared. Sign the on-chain transaction via MetaMask.",
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: "Duplicate entry" });
        }
        console.error("prepareCertificate error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * POST /certificates/confirm
 * Called after MetaMask confirms the on-chain transaction.
 */
export async function confirmCertificate(req, res) {
    try {
        const { fieldHash, txHash } = req.body;

        if (!fieldHash || !txHash) {
            return res.status(400).json({
                error: "Missing required fields: fieldHash, txHash",
            });
        }

        const cert = await Certificate.findOne({ fieldHash });
        if (!cert) {
            return res.status(404).json({ error: "Certificate not found" });
        }
        if (cert.status !== "pending") {
            return res.status(400).json({ error: `Certificate is already ${cert.status}` });
        }

        cert.status = "issued";
        cert.txHash = txHash;
        await cert.save();

        res.json({
            message: "Certificate confirmed on-chain",
            fieldHash,
            txHash,
        });
    } catch (error) {
        console.error("confirmCertificate error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * GET /certificates
 * List certificates for the authenticated university.
 */
export async function listCertificates(req, res) {
    try {
        const university = await University.findOne({
            walletAddress: req.user.walletAddress,
        });
        if (!university) {
            return res.status(404).json({ error: "University not found" });
        }

        const certificates = await Certificate.find({
            universityId: university._id,
        }).sort({ createdAt: -1 });

        res.json(certificates);
    } catch (error) {
        console.error("listCertificates error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * DELETE /certificates/:fieldHash
 * Delete a pending (unsigned) certificate.
 */
export async function deletePendingCertificate(req, res) {
    try {
        const { fieldHash } = req.params;

        const cert = await Certificate.findOne({ fieldHash });
        if (!cert) {
            return res.status(404).json({ error: "Certificate not found" });
        }

        if (cert.status !== "pending") {
            return res.status(400).json({
                error: "Only pending (unsigned) certificates can be deleted",
            });
        }

        const university = await University.findById(cert.universityId);
        if (!university || university.walletAddress !== req.user.walletAddress) {
            return res.status(403).json({
                error: "Only the issuing university can delete this certificate",
            });
        }

        await Certificate.deleteOne({ fieldHash });
        res.json({ message: "Pending certificate deleted" });
    } catch (error) {
        console.error("deletePendingCertificate error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * POST /certificates/:fieldHash/revoke/prepare
 */
export async function prepareRevoke(req, res) {
    try {
        const { fieldHash } = req.params;

        const cert = await Certificate.findOne({ fieldHash });
        if (!cert) {
            return res.status(404).json({ error: "Certificate not found" });
        }

        const university = await University.findById(cert.universityId);
        if (!university || university.walletAddress !== req.user.walletAddress) {
            return res.status(403).json({
                error: "Only the issuing university can revoke this certificate",
            });
        }

        if (cert.status === "revoked") {
            return res.status(400).json({ error: "Certificate is already revoked" });
        }

        res.json({
            fieldHash,
            message: "Ready to revoke. Sign the on-chain transaction via MetaMask.",
        });
    } catch (error) {
        console.error("prepareRevoke error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * POST /certificates/:fieldHash/revoke/confirm
 */
export async function confirmRevoke(req, res) {
    try {
        const { fieldHash } = req.params;
        const { txHash } = req.body;

        const cert = await Certificate.findOne({ fieldHash });
        if (!cert) {
            return res.status(404).json({ error: "Certificate not found" });
        }

        cert.status = "revoked";
        cert.txHash = txHash || cert.txHash;
        await cert.save();

        res.json({ message: "Certificate revoked", fieldHash });
    } catch (error) {
        console.error("confirmRevoke error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
