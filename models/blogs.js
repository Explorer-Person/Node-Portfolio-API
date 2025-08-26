const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    fk: String,
    title: String,
    slug: String,
    excerpt: String,
    html: String,
    jsonModel: String,
    coverImage: String,
    medias: [String],
    tags: [String],
    href: String,
    priority: Number,
}, { timestamps: true });

module.exports = mongoose.model("Blogs", blogSchema);
