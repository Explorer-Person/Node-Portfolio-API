const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
    {
        _id: { type: String, required: true },          // optional; your external id
        fk: { type: String, required: true },       // profile/user foreign key
        label: { type: String, required: true },
        value: { type: String, required: true },
        priority: { type: String, required: true },
        icon: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Contacts", contactSchema);
