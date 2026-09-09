import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
    universityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "University",
        required: true,
    },
    studentId: {
        type: String,
        required: true,
    },
    fieldHash: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    txHash: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: ["pending", "issued", "revoked"],
        default: "pending",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// studentId must be unique per university
certificateSchema.index({ universityId: 1, studentId: 1 }, { unique: true });

export default mongoose.model("Certificate", certificateSchema);
