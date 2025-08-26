const mongoose = require("mongoose");

const heroSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        fk: { type: String, required: true },
        title: { type: String, default: "" },
        desc: { type: String, default: "" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Hero", heroSchema);
