import University from "../models/University.js";
import User from "../models/User.js";

/**
 * POST /admin/universities/prepare
 * Validate fields, check for duplicates, and save university as 'pending_onchain'.
 * No User record is created yet — the university can't log in until confirmed.
 * Returns the wallet address for the frontend to sign addAuthorizedIssuer() on-chain.
 */
export async function prepareUniversity(req, res) {
    try {
        const { name, shortCode, walletAddress } = req.body;

        if (!name || !shortCode || !walletAddress) {
            return res.status(400).json({
                error: "Missing required fields: name, shortCode, walletAddress",
            });
        }

        // Check for duplicates (active OR pending)
        const existingUniv = await University.findOne({
            $or: [
                { shortCode: shortCode.toUpperCase() },
                { walletAddress: walletAddress.toLowerCase() },
            ],
        });

        // If a pending entry already exists for this wallet, return it (idempotent)
        if (existingUniv && existingUniv.status === "pending_onchain") {
            return res.json({
                message: "Pending entry exists. Sign addAuthorizedIssuer() on-chain to confirm.",
                university: existingUniv,
            });
        }

        if (existingUniv) {
            return res.status(409).json({
                error: "University with this shortCode or walletAddress already exists",
            });
        }

        // Create university as pending — no User record yet
        const university = await University.create({
            name,
            shortCode: shortCode.toUpperCase(),
            walletAddress: walletAddress.toLowerCase(),
            status: "pending_onchain",
        });

        res.json({
            message: "University saved as pending. Sign addAuthorizedIssuer() on-chain to confirm.",
            university,
        });
    } catch (error) {
        console.error("prepareUniversity error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * POST /admin/universities/confirm
 * Called AFTER the on-chain addAuthorizedIssuer() transaction succeeds.
 * Promotes university from 'pending_onchain' to 'active' and creates the User record.
 */
export async function confirmUniversity(req, res) {
    try {
        const { walletAddress, txHash } = req.body;

        if (!walletAddress || !txHash) {
            return res.status(400).json({
                error: "Missing required fields: walletAddress, txHash",
            });
        }

        const university = await University.findOne({
            walletAddress: walletAddress.toLowerCase(),
        });

        if (!university) {
            return res.status(404).json({
                error: "No university found for this wallet address. Use prepare first.",
            });
        }

        if (university.status === "active") {
            return res.json({
                message: "University already active.",
                university,
            });
        }

        // Promote to active
        university.status = "active";
        university.txHash = txHash;
        await university.save();

        // Now create the User record (this grants login access)
        const existingUser = await User.findOne({
            walletAddress: walletAddress.toLowerCase(),
        });
        if (!existingUser) {
            await User.create({
                walletAddress: walletAddress.toLowerCase(),
                role: "university",
                universityId: university._id,
            });
        }

        res.status(201).json({
            message: "University confirmed and whitelisted on-chain.",
            university,
            txHash,
        });
    } catch (error) {
        console.error("confirmUniversity error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * DELETE /admin/universities/:walletAddress
 * Delete a pending university entry (e.g. if the admin decides not to whitelist).
 * Only works for pending_onchain universities.
 */
export async function deletePendingUniversity(req, res) {
    try {
        const { walletAddress } = req.params;

        const university = await University.findOne({
            walletAddress: walletAddress.toLowerCase(),
        });

        if (!university) {
            return res.status(404).json({ error: "University not found" });
        }

        if (university.status === "active") {
            return res.status(400).json({
                error: "Cannot delete an active university. Remove the issuer on-chain first.",
            });
        }

        await University.deleteOne({ _id: university._id });

        res.json({ message: "Pending university entry deleted." });
    } catch (error) {
        console.error("deletePendingUniversity error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * GET /admin/universities
 * List all registered universities (both pending and active).
 */
export async function listUniversities(req, res) {
    try {
        const universities = await University.find().sort({ createdAt: -1 });
        res.json(universities);
    } catch (error) {
        console.error("listUniversities error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
