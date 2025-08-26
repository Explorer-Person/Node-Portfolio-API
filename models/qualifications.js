const mongoose = require("mongoose");

const qualificationSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        fk: { type: Number, required: true },
        type: { type: String, enum: ["cert", "edu"], required: true },
        title: { type: String, required: true },
        org: { type: String, default: "" },
        year: { type: String, default: "" }, // allow "2022–2024"
        url: { type: String, default: "" },
        logo: { type: String, default: "" },
        priority: { type: Number, default: 0 }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Qualifications", qualificationSchema);
