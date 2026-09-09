import mongoose from "mongoose";

const verificationLogSchema = new mongoose.Schema({
    certID: {
        type: String,
        required: true,
    },
    result: {
        type: String,
        enum: ["Valid", "Tampered", "Revoked", "Not Found"],
        required: true,
    },
    responseTimeMs: {
        type: Number,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model("VerificationLog", verificationLogSchema);
