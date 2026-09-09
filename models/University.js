import mongoose from "mongoose";

const universitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    shortCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    walletAddress: {
        type: String,
        required: true,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model("University", universitySchema);
