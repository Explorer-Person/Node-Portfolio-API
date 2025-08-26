const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    fk: String,
    username: String,
    password: String,
    phone: String,
    email: String
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);
