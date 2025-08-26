const mongoose = require("mongoose");

const techStackSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        fk: { type: String, required: true },
        icon: { type: String, default: "" }, // image path or token
        name: { type: String, required: true },
        level: { type: String, default: "" }, // "Advanced", ...
        priority: { type: Number, default: 0 }
    },
    { timestamps: true }
);

module.exports = mongoose.model("TechStack", techStackSchema);
