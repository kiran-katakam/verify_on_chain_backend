import VerificationLog from "../models/VerificationLog.js";
import { verifyCertificateByHash, computeFieldHash } from "../config/contract.js";

/**
 * POST /verify
 * Public endpoint — no authentication required.
 *
 * Accepts: { firstName, lastName, dob, studentId, percentile, issuerAddress }
 *
 * Computes hash → looks up on-chain → returns result.
 */
export async function verifyCertificate(req, res) {
    const startTime = Date.now();

    try {
        const { firstName, lastName, dob, studentId, percentile, issuerAddress } = req.body;

        if (!firstName || !lastName || !dob || !studentId || percentile === undefined || !issuerAddress) {
            return res.status(400).json({
                error: "All fields required: firstName, lastName, dob, studentId, percentile, issuerAddress",
            });
        }

        // Compute hash
        const fieldHash = computeFieldHash(
            { firstName, lastName, dob, studentId, percentile: Number(percentile) },
            issuerAddress
        );

        // Look up on-chain
        let chainResult;
        try {
            chainResult = await verifyCertificateByHash(fieldHash);
        } catch (err) {
            console.error("Chain query error:", err.message);
            return res.status(503).json({
                error: "Unable to query blockchain. Is the node running?",
            });
        }

        // Not Found
        if (!chainResult.exists) {
            await logVerification(fieldHash, "Not Found", startTime);
            return res.json({
                result: "Not Found",
                message: "No certificate found matching these details. The data may be incorrect or tampered.",
                details: null,
            });
        }

        // Revoked
        if (!chainResult.isValid) {
            await logVerification(fieldHash, "Revoked", startTime);
            return res.json({
                result: "Revoked",
                message: "This certificate has been revoked by the issuer.",
                details: {
                    issuer: chainResult.issuer,
                    issuedAt: new Date(chainResult.timestamp * 1000).toISOString(),
                },
            });
        }

        // Valid
        await logVerification(fieldHash, "Valid", startTime);
        return res.json({
            result: "Valid",
            message: "Certificate is authentic and valid on the blockchain.",
            details: {
                issuer: chainResult.issuer,
                issuedAt: new Date(chainResult.timestamp * 1000).toISOString(),
            },
        });
    } catch (error) {
        console.error("verifyCertificate error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function logVerification(fieldHash, result, startTime) {
    try {
        await VerificationLog.create({
            certID: fieldHash,
            result,
            responseTimeMs: Date.now() - startTime,
        });
    } catch (err) {
        console.error("Failed to log verification:", err.message);
    }
}
