const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        fk: { type: String, required: true },
        title: { type: String, required: true },
        slug: { type: String, default: "" },
        description: { type: String, default: "" },
        coverImage: { type: String, default: "" },
        medias: { type: [String], default: [] },
        gitLink: { type: String, default: "" },
        prodLink: { type: String, default: "" },
        tags: { type: [String], default: [] },
        priority: { type: Number, default: 0 }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Projects", projectSchema);
