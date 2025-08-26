const mongoose = require("mongoose");

const contributionSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        fk: { type: String, required: true },
        title: { type: String, required: true },
        slug: { type: String, default: "" },
        excerpt: { type: String, default: "" },
        coverImage: { type: String, default: "" },
        href: { type: String, default: "" },
        priority: { type: Number, default: 0 }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Contributions", contributionSchema);
