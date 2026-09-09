import University from "../models/University.js";
import User from "../models/User.js";

/**
 * POST /admin/universities
 * Create a new university and its user record.
 */
export async function createUniversity(req, res) {
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

        // The admin frontend will need to call addAuthorizedIssuer() on-chain
        // with this wallet address — that happens client-side via MetaMask
        res.status(201).json({
            message: "University created. Admin must sign addAuthorizedIssuer() on-chain.",
            university: {
                id: university._id,
                name: university.name,
                shortCode: university.shortCode,
                walletAddress: university.walletAddress,
            },
        });
    } catch (error) {
        console.error("createUniversity error:", error);
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
