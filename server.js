import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import University from "./models/University.js";
import User from "./models/User.js";

// Route imports
import adminRoutes from "./routes/admin.js";
import certificateRoutes from "./routes/certificates.js";
import verifyRoutes from "./routes/verify.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" })); // large enough for QR base64

// ── Routes ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Public: list all universities (name + wallet) for verifier dropdown
app.get("/universities", async (req, res) => {
    try {
        const universities = await University.find(
            {},
            { name: 1, shortCode: 1, walletAddress: 1 }
        ).sort({ name: 1 });
        res.json(universities);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Public: check wallet role
app.get("/auth/role", async (req, res) => {
    const walletAddress = req.headers["x-wallet-address"];
    if (!walletAddress) {
        return res.json({ role: "FUCK" });
    }
    const user = await User.findOne({ walletAddress: walletAddress });
    res.json({ role: user?.role || null });
});

app.use("/admin", adminRoutes);
app.use("/certificates", certificateRoutes);
app.use("/verify", verifyRoutes);

// ── 404 catch-all ───────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// ── Start ───────────────────────────────────────────────────────────────
async function start() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`VerifyOnChain backend running on http://localhost:${PORT}`);
    });
}

start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
