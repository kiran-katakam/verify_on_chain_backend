import User from "../models/User.js";

/**
 * Simple wallet-based auth middleware.
 * Expects x-wallet-address header with the connected wallet address.
 * Looks up the user by wallet and attaches to req.user.
 */
export async function requireAuth(req, res, next) {
    const walletAddress = req.headers["x-wallet-address"];
    if (!walletAddress) {
        return res.status(401).json({ error: "Missing x-wallet-address header" });
    }

    const user = await User.findOne({
        walletAddress: walletAddress.toLowerCase(),
    });
    if (!user) {
        return res.status(403).json({ error: "Wallet not registered" });
    }

    req.user = user;
    next();
}

/**
 * Role-based access control middleware.
 * @param  {...string} roles - Allowed roles (e.g., "admin", "university")
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Role '${req.user.role}' not authorized. Required: ${roles.join(", ")}`,
            });
        }
        next();
    };
}
