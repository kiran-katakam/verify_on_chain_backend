import University from "../models/University.js";
import User from "../models/User.js";

/**
 * POST /admin/universities/prepare
 * Validate fields and check for duplicates, but do NOT create DB records yet.
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

        // Check for duplicates
        const existingUniv = await University.findOne({
            $or: [
                { shortCode: shortCode.toUpperCase() },
                { walletAddress: walletAddress.toLowerCase() },
            ],
        });
        if (existingUniv) {
            return res.status(409).json({
                error: "University with this shortCode or walletAddress already exists",
            });
        }

        res.json({
            message: "Validation passed. Sign addAuthorizedIssuer() on-chain to proceed.",
            walletAddress: walletAddress.toLowerCase(),
        });
    } catch (error) {
        console.error("prepareUniversity error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * POST /admin/universities/confirm
 * Called AFTER the on-chain addAuthorizedIssuer() transaction succeeds.
 * Creates the University and User records in MongoDB.
 */
export async function confirmUniversity(req, res) {
    try {
        const { name, shortCode, walletAddress, txHash } = req.body;

        if (!name || !shortCode || !walletAddress || !txHash) {
            return res.status(400).json({
                error: "Missing required fields: name, shortCode, walletAddress, txHash",
            });
        }

        // Double-check for duplicates (in case of race conditions)
        const existingUniv = await University.findOne({
            $or: [
                { shortCode: shortCode.toUpperCase() },
                { walletAddress: walletAddress.toLowerCase() },
            ],
        });
        if (existingUniv) {
            return res.status(409).json({
                error: "University with this shortCode or walletAddress already exists",
            });
        }

        // Create the university
        const university = await University.create({
            name,
            shortCode: shortCode.toUpperCase(),
            walletAddress: walletAddress.toLowerCase(),
        });

        // Create a user for the university wallet
        await User.create({
            walletAddress: walletAddress.toLowerCase(),
            role: "university",
            universityId: university._id,
        });

        res.status(201).json({
            message: "University registered and whitelisted on-chain.",
            university: {
                id: university._id,
                name: university.name,
                shortCode: university.shortCode,
                walletAddress: university.walletAddress,
            },
            txHash,
        });
    } catch (error) {
        console.error("confirmUniversity error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * GET /admin/universities
 * List all registered universities.
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
