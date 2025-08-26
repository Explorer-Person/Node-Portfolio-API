const mongoose = require("mongoose");

const socialSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        // your example had "" for fk; to be flexible, keep it optional number
        fk: { type: String, default: "" },
        platform: { type: String, default: "" },
        icon: { type: String, default: "" }, // e.g., "FaLinkedin"
        url: { type: String, default: "" },
        size: { type: Number, default: 60 },
        priority: { type: Number, default: 0 }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Socials", socialSchema);
