const mongoose = require("mongoose");

const ProfileImageSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },
        fk: { type: String, required: true },
        src: { type: String, required: true },
        alt: { type: String, default: "" },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        className: { type: String, default: "" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("ProfileImage", ProfileImageSchema);
